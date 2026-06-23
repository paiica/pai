export type PageTabsData = {
  right_for_you?: {
    headline?: string;
    body?: string;
    stats?: { value: string; label: string }[];
    requirements?: string[];
    not_ready_text?: string;
    not_ready_href?: string;
  };
  path?: {
    headline?: string;
    body?: string;
    steps?: { title: string; description: string }[];
  };
  prepare?: {
    headline?: string;
    body?: string;
    resources?: { title: string; description: string }[];
  };
  maintenance?: {
    headline?: string;
    body?: string;
    renewal_items?: string[];
  };
};
