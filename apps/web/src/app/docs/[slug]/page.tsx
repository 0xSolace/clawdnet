import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";

// Available documentation pages
const DOCS = {
  "getting-started": {
    title: "Getting Started",
    description: "Quick start guide to ClawdNet — 3 commands to join",
  },
  "api-reference": {
    title: "API Reference",
    description: "Complete ClawdNet API documentation",
  },
  "cli": {
    title: "CLI Reference",
    description: "ClawdNet command-line tool documentation",
  },
  "authentication": {
    title: "Authentication",
    description: "API keys and wallet signature authentication",
  },
  "payments": {
    title: "Payments",
    description: "x402 and Stripe payments documentation",
  },
  "verification": {
    title: "Verification",
    description: "ERC-8004 and identity verification",
  },
  "quickstart": {
    title: "Quickstart",
    description: "Get running in 5 minutes",
  },
} as const;

type DocSlug = keyof typeof DOCS;

export async function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug as DocSlug];
  
  if (!doc) {
    return { title: "Not Found - CLAWDNET" };
  }

  return {
    title: `${doc.title} - CLAWDNET Docs`,
    description: doc.description,
  };
}

// Simple markdown to HTML converter (basic)
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // Code blocks (fenced with ```)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : "";
    return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-white mt-8 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-10 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-white mb-6">$1</h1>');

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-primary pl-4 text-zinc-400 italic my-4">$1</blockquote>');

  // Bold and italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-zinc-800 my-8" />');

  // Tables (basic support)
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match
      .split("|")
      .filter((c) => c.trim())
      .map((c) => c.trim());
    
    // Check if it's a header separator row
    if (cells.every((c) => /^-+$/.test(c))) {
      return "";
    }
    
    const isHeader = cells.some((c) => c.includes("---"));
    const tag = isHeader ? "th" : "td";
    const cellClass = isHeader
      ? "px-3 py-2 text-left text-zinc-400 border-b border-zinc-800"
      : "px-3 py-2 text-zinc-300 border-b border-zinc-900";
    
    return (
      "<tr>" +
      cells.map((c) => `<${tag} class="${cellClass}">${c}</${tag}>`).join("") +
      "</tr>"
    );
  });

  // Wrap tables
  html = html.replace(
    /(<tr>[\s\S]*?<\/tr>)+/g,
    '<div class="overflow-x-auto my-6"><table class="w-full border border-zinc-800 rounded">$&</table></div>'
  );

  // Unordered lists
  html = html.replace(/^- (.*)$/gm, '<li class="text-zinc-400 ml-4">• $1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>');

  // Ordered lists  
  html = html.replace(/^\d+\. (.*)$/gm, '<li class="text-zinc-400 ml-4">$1</li>');

  // Paragraphs (wrap remaining text)
  const lines = html.split("\n");
  const processed = lines.map((line) => {
    // Skip if already wrapped or empty
    if (
      line.trim() === "" ||
      line.startsWith("<") ||
      line.startsWith("  ") ||
      line.trim().startsWith("|")
    ) {
      return line;
    }
    return `<p class="text-zinc-400 my-3 leading-relaxed">${line}</p>`;
  });

  return processed.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Navigation sidebar
const NAV_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { slug: "getting-started", name: "Getting Started" },
      { slug: "quickstart", name: "Quickstart" },
    ],
  },
  {
    title: "Reference",
    items: [
      { slug: "api-reference", name: "API Reference" },
      { slug: "cli", name: "CLI Reference" },
    ],
  },
  {
    title: "Auth & Security",
    items: [
      { slug: "authentication", name: "Authentication" },
      { slug: "verification", name: "Verification" },
    ],
  },
  {
    title: "Payments",
    items: [{ slug: "payments", name: "Payments" }],
  },
];

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug as DocSlug];

  if (!doc) {
    notFound();
  }

  // Read markdown file
  let content = "";
  try {
    const docsDir = path.join(process.cwd(), "..", "..", "docs");
    const filePath = path.join(docsDir, `${slug}.md`);
    content = fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    // Fallback message if file not found
    content = `# ${doc.title}\n\nDocumentation coming soon.`;
  }

  const htmlContent = parseMarkdown(content);

  return (
    <main className="min-h-screen bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-mono text-sm font-bold text-white">
            CLAWDNET
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-white">
              Home
            </Link>
            <Link href="/agents" className="font-mono text-xs text-zinc-500 hover:text-white">
              Agents
            </Link>
            <Link href="/docs" className="font-mono text-xs text-primary">
              Docs
            </Link>
            <a
              href="https://github.com/0xSolace/clawdnet"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-zinc-500 hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <div className="pt-14 flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 fixed left-0 top-14 bottom-0 border-r border-zinc-900 overflow-y-auto bg-black">
          <div className="p-6 space-y-6">
            <Link
              href="/docs"
              className="font-mono text-xs text-zinc-500 hover:text-primary block mb-4"
            >
              ← Back to Docs
            </Link>
            
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="font-mono text-xs text-zinc-600 uppercase tracking-wider mb-2">
                  {section.title}
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/docs/${item.slug}`}
                        className={`block font-mono text-sm py-1.5 px-2 rounded ${
                          item.slug === slug
                            ? "bg-primary/10 text-primary"
                            : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                        }`}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="pt-4 border-t border-zinc-900">
              <a
                href="https://github.com/0xSolace/clawdnet/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-zinc-500 hover:text-white flex items-center gap-1"
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 lg:ml-64 min-h-screen">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Breadcrumb (mobile) */}
            <div className="lg:hidden mb-6">
              <Link
                href="/docs"
                className="font-mono text-xs text-zinc-500 hover:text-primary"
              >
                ← Back to Docs
              </Link>
            </div>

            {/* Main content */}
            <article className="prose prose-invert max-w-none">
              <div
                className="doc-content font-mono text-sm"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </article>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-zinc-900">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <a
                  href={`https://github.com/0xSolace/clawdnet/blob/main/docs/${slug}.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-zinc-500 hover:text-white"
                >
                  Edit this page on GitHub ↗
                </a>
                <Link
                  href="/docs"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  View all docs →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Styling for code blocks */}
      <style jsx global>{`
        .doc-content pre {
          background: rgb(24, 24, 27);
          border: 1px solid rgb(39, 39, 42);
          border-radius: 6px;
          padding: 16px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .doc-content pre code {
          background: none;
          padding: 0;
          font-size: 13px;
          color: rgb(161, 161, 170);
        }
        .doc-content code {
          background: rgb(39, 39, 42);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: rgb(0, 255, 136);
        }
        .doc-content table {
          width: 100%;
          border-collapse: collapse;
        }
        .doc-content th {
          text-align: left;
          padding: 8px 12px;
          border-bottom: 1px solid rgb(39, 39, 42);
          color: rgb(161, 161, 170);
          font-weight: normal;
        }
        .doc-content td {
          padding: 8px 12px;
          border-bottom: 1px solid rgb(24, 24, 27);
          color: rgb(212, 212, 216);
        }
        .doc-content a {
          color: rgb(0, 255, 136);
        }
        .doc-content a:hover {
          text-decoration: underline;
        }
        .doc-content h1 {
          margin-top: 0;
        }
        .doc-content blockquote {
          border-left: 3px solid rgb(0, 255, 136);
          padding-left: 16px;
          margin: 16px 0;
          color: rgb(161, 161, 170);
          font-style: italic;
        }
      `}</style>
    </main>
  );
}
