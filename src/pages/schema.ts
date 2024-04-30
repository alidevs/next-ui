export type SolrResponse = {
  responseHeader: {
    status: number;
    QTime: number;
    params: {
      q: string;
      indent: string;
      qop: string;
      rows: string;
      useParams: string;
      _: string;
    };
  };
  response: {
    numFound: number;
    start: number;
    numFoundExact: boolean;
    docs: {
      tstamp: string[];
      digest: string[];
      host: string[];
      boost: number[];
      id: string;
      title: string[];
      url: string[];
      content: string[];
      _version_: number;
    }[];
  };
};
