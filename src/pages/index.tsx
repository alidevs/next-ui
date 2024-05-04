import '@/styles/globals.css';
import React, { useEffect, useState } from 'react';

function useSolr(params) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!params.q) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      const queryParams = new URLSearchParams(params).toString();
      const url = `/api/solr?${queryParams}`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const jsonData = await response.json();
        console.log('Solr response:', jsonData); // Log the Solr response for debugging
        setData(jsonData);
      } catch (error) {
        setError(new Error(error.message));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(params)]);

  return { data, error, isLoading };
}

function highlightText(text, searchTerm, highlightedParts, maxLength) {
  if (!searchTerm || searchTerm.trim() === '' || !highlightedParts) {
    return text;
  }

  // Check if there is highlighting data available
  if (Array.isArray(text)) {
    const highlightedText = text.find((part) => part.includes('<em>'));
    if (highlightedText) {
      return highlightedText.length > maxLength
        ? `${highlightedText.substring(0, maxLength)}...`
        : highlightedText;
    }
  }

  // If no highlighting data, fallback to the original content
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const highlightedContent = text.split(regex).map((part, index) =>
    highlightedParts.includes(part.toLowerCase()) ? (
      <span key={index} className="highlight">
        {part}
      </span>
    ) : (
      part
    ),
  );

  const concatenatedContent = highlightedContent.join('');
  return concatenatedContent.length > maxLength
    ? `${concatenatedContent.substring(0, maxLength)}...`
    : concatenatedContent;
}

function DocumentItem({ doc, searchTerm }) {
  const title = doc.title?.[0] ?? 'No Title';
  const content = doc.content?.[0] ?? 'No Content';
  const highlightedTitle = doc.highlighting?.[doc.id]?.title || title; // Use highlighting for title if available // Otherwise, use the default title
  const highlightedContent = doc.highlighting?.[doc.id]?.content || content; // Use highlighting for content if available // Otherwise, use the default content

  const truncatedContent = highlightText(
    highlightedContent,
    searchTerm,
    [searchTerm],
    300,
  );

  return (
    <div
      className="cursor-pointer rounded-lg bg-gray-100 p-4 shadow-lg hover:bg-gray-200"
      onClick={() => window.open(doc.url?.[0], '_blank')}
    >
      <h3 className="text-lg font-semibold">
        {highlightText(highlightedTitle, searchTerm, [searchTerm])}
      </h3>
      <a
        href={doc.url?.[0]}
        target="_blank"
        rel="noreferrer"
        className="text-blue-500"
      >
        {doc.url?.[0] ?? 'No URL'}
      </a>
      <p className="mt-2 text-gray-700">{truncatedContent}</p>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [start, setStart] = useState(0);
  const rowsPerPage = 20;

  const solrParams = {
    q: debouncedQuery,
    defType: 'dismax',
    indent: 'on',
    qop: 'AND',
    qf: 'title content url',
    rows: rowsPerPage,
    sort: 'boost desc',
    start: start,
    rq: '{!rerank reRankQuery=$rqq reRankDocs=1000 reRankWeight=30}',
    rqq: 'url:*\\.sa',
    hl: 'on',
    'hl.fl': 'content',
    'hl.snippets': 3,
  };

  const { data, error, isLoading } = useSolr(solrParams);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const handleSearchChange = (event) => setQuery(event.target.value);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setDebouncedQuery(query);
    setStart(0);
  };

  const handleNextPage = () => {
    setStart((prevStart) => prevStart + rowsPerPage);
  };

  const handlePreviousPage = () => {
    setStart((prevStart) => Math.max(0, prevStart - rowsPerPage));
  };

  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (error)
    return (
      <div className="p-4 text-center text-red-500">
        Error: {error.message}
      </div>
    );

  return (
    <div className="p-4">
      <form
        onSubmit={handleSearchSubmit}
        className="mb-4 flex items-center"
      >
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search documents..."
          className="flex-grow rounded-l border border-r-0 p-2"
        />
        <button
          type="submit"
          className="rounded-r bg-blue-500 p-2 text-white hover:bg-blue-600"
        >
          Search
        </button>
      </form>

      {data && data.response && data.response.docs.length > 0 ? (
        <>
          {data.response.docs.map((doc) => (
            <DocumentItem
              key={doc.id}
              doc={doc}
              searchTerm={debouncedQuery}
            />
          ))}
          <div className="mt-4 flex">
            <button
              onClick={handlePreviousPage}
              disabled={data.response.start === 0}
              className="mx-4 rounded bg-gray-300 p-2 text-white hover:bg-gray-400"
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={
                data.response.start + rowsPerPage >=
                data.response.numFound
              }
              className="rounded bg-gray-300 p-2 text-white hover:bg-gray-400"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        debouncedQuery && (
          <p className="text-center">No documents found.</p>
        )
      )}
    </div>
  );
}
