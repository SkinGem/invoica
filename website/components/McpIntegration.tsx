import Link from 'next/link';

export default function McpIntegration() {
  return (
    <section id='mcp' className='py-28 bg-invoica-blue relative'>
      <div className='max-w-7xl mx-auto px-6'>
        {/* Badge */}
        <div className='flex justify-center mb-8'>
          <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-invoica-purple/20 text-invoica-purple border border-invoica-purple/30'>
            MCP Server
          </span>
        </div>

        {/* Heading */}
        <h2 className='text-white text-4xl md:text-5xl font-bold tracking-tight text-center mb-6 max-w-3xl mx-auto'>
          Use Invoica from Claude, Cursor & Windsurf
        </h2>

        {/* Subtext */}
        <p className='text-invoica-gray-400 text-lg text-center mb-12 max-w-2xl mx-auto'>
          Your AI assistant can create invoices, list payments, and verify on-chain settlements — directly from the chat.
        </p>

        {/* Code Blocks */}
        <div className='grid md:grid-cols-2 gap-6 mb-12'>
          {/* Install Command */}
          <div>
            <p className='text-invoica-gray-400 text-sm mb-3'>Install (one command)</p>
            <div className='bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm text-green-400'>
              npx -y @invoica/mcp
            </div>
          </div>

          {/* Claude Desktop Config */}
          <div>
            <p className='text-invoica-gray-400 text-sm mb-3'>Claude Desktop config</p>
            <div className='bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm text-green-400 overflow-x-auto'>
              <pre>{`{
  "mcpServers": {
    "invoica": {
      "command": "npx",
      "args": ["-y", "@invoica/mcp"]
    }
  }
}`}</pre>
            </div>
          </div>
        </div>

        {/* Tool Pills */}
        <div className='flex flex-wrap justify-center gap-3 mb-12'>
          <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-invoica-gray-300 border border-white/10'>
            create_invoice
          </span>
          <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-invoica-gray-300 border border-white/10'>
            list_invoices
          </span>
          <span className='inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-invoica-gray-300 border border-white/10'>
            check_settlement
          </span>
        </div>

        {/* CTA */}
        <div className='text-center'>
          <Link
            href='https://app.invoica.ai/api-keys?utm_source=website&utm_medium=mcp&utm_campaign=beta2026'
            className='text-invoica-purple-light hover:text-white underline text-sm transition-colors'
          >
            Get your free API key
          </Link>
        </div>
      </div>
    </section>
  );
}