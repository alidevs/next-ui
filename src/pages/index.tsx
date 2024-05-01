import '@/styles/globals.css';
import { useEffect, useState } from 'react';

function useSolr(params) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!params.q) {
      setData(null);
      return;
    }

    const queryParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        queryParams.set(key, params[key]);
      }
    });

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const url = `http://localhost:8983/solr/nutch/select?${queryParams.toString()}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const jsonData = await response.json();
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

function DocumentItem({ doc }) {
  const contentSnippet = doc.content?.[0]
    ? doc.content[0].substring(0, 500)
    : 'No Content';

  return (
    <div className="rounded-lg bg-gray-100 p-4 shadow-lg hover:bg-gray-200">
      <h3 className="text-lg font-semibold">
        {doc.title?.[0] ? doc.title[0] : 'No Title'}
      </h3>
      <a
        href={doc.url?.[0]}
        className="text-sm text-blue-500 hover:text-blue-700"
      >
        {doc.url?.[0]}
      </a>
      <p className="mt-2 text-gray-700">{contentSnippet}</p>
      <p className="mt-1 text-sm">
        <span className="m-2 rounded bg-blue-100 p-1.5 text-xs font-semibold text-blue-800">
          B: {doc.boost?.[0] ?? 'No Boost'}
        </span>
        <span className="m-2 rounded bg-blue-100 p-1.5 text-xs font-semibold text-blue-800">
          R: {doc.rank?.[0] ?? 'No Rank'}
        </span>
      </p>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [submitQuery, setSubmitQuery] = useState('');
  const [start, setStart] = useState(0);
  const rowsPerPage = 10;

  const solrParams = {
    q: submitQuery,
    defType: 'dismax',
    qf: 'title^4 content',
    indent: 'on',
    qop: 'AND',
    start: start,
    rows: rowsPerPage,
    useParams: 'title,host,content',
    sort: 'boost desc',
  };

  const { data, error, isLoading } = useSolr(solrParams);

  const handleSearchChange = (event) => setQuery(event.target.value);
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSubmitQuery(query);
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
      <form onSubmit={handleSearchSubmit} className="flex items-center">
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
            <DocumentItem key={doc.id} doc={doc} />
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
        submitQuery && (
          <p className="text-center">No documents found.</p>
        )
      )}
    </div>
  );
}
