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

    const fetchData = async () => {
      setIsLoading(true);
      const queryParams = new URLSearchParams(params).toString();
      const url = `http://localhost:8983/solr/nutch/select?${queryParams}`;

      try {
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
    <div
      className="cursor-pointer rounded-lg bg-gray-100 p-4 shadow-lg hover:bg-gray-200"
      onClick={() => window.open(doc.url?.[0], '_blank')}
    >
      <h3 className="text-lg font-semibold">
        {doc.title?.[0] ? doc.title[0] : 'No Title'}
      </h3>
      <p className="mt-2 text-gray-700">{contentSnippet}</p>
      <p className="mt-1 text-sm">
        <span className="m-2 rounded bg-blue-100 p-1.5 text-xs font-semibold text-blue-800">
          B: {doc.boost?.[0] ?? 'No Boost'}
        </span>
        <span className="m-2 rounded bg-blue-100 p-1.5 text-xs font-semibold text-blue-800">
          R: {doc.rank ?? 'No Rank'}
        </span>
      </p>
    </div>
  );
}

function FieldBoostCheckbox({
  field,
  onBoostChange,
  onCheckChange,
  isChecked,
  boostValue,
}) {
  return (
    <div className="flex items-center">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => onCheckChange(field, e.target.checked)}
        className="mr-2"
      />
      {field}
      {isChecked && (
        <input
          type="number"
          placeholder="Boost"
          value={boostValue}
          onChange={(e) => onBoostChange(field, e.target.value)}
          className="ml-2 w-20 rounded border p-1"
        />
      )}
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [start, setStart] = useState(0);
  const [fieldBoosts, setFieldBoosts] = useState({
    title: { boost: 10, checked: true },
    url: { boost: 2, checked: true },
    content: { boost: 1, checked: true },
  });
  const rowsPerPage = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  const handleFieldBoostChange = (field, boost) => {
    setFieldBoosts((prev) => ({
      ...prev,
      [field]: { ...prev[field], boost },
    }));
  };

  const handleFieldCheckChange = (field, checked) => {
    setFieldBoosts((prev) => ({
      ...prev,
      [field]: { ...prev[field], checked },
    }));
  };

  const solrParams = {
    q: debouncedQuery,
    defType: 'dismax',
    qf: Object.entries(fieldBoosts)
      .filter(([_, data]) => data.checked)
      .map(([field, data]) => `${field}^${data.boost}`)
      .join(' '),
    indent: 'on',
    qop: 'AND',
    rows: rowsPerPage,
    useParams: Object.keys(fieldBoosts)
      .filter((field) => fieldBoosts[field].checked)
      .join(','),
    sort: 'boost desc',
    start: start,
  };

  const { data, error, isLoading } = useSolr(solrParams);

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
      <div className="mb-4 flex flex-wrap gap-4">
        {Object.keys(fieldBoosts).map((field) => (
          <FieldBoostCheckbox
            key={field}
            field={field}
            onBoostChange={handleFieldBoostChange}
            onCheckChange={handleFieldCheckChange}
            isChecked={fieldBoosts[field].checked}
            boostValue={fieldBoosts[field].boost}
          />
        ))}
      </div>

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
        debouncedQuery && (
          <p className="text-center">No documents found.</p>
        )
      )}
    </div>
  );
}
