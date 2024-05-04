export default async function handler(req, res) {
  const { query } = req;

  if (!query.q) {
    res.status(400).json({ error: 'Query parameter "q" is required.' });
    return;
  }

  const queryParams = new URLSearchParams(query).toString();
  const url = `http://8.213.30.90:8983/solr/nutch/select?${queryParams}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(response);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonData = await response.json();
    res.status(200).json(jsonData);

    // Print curl command for debugging
    console.log(`\n\ncurl -X GET "${url}"\n\n`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
