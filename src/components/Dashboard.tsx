import { useState, useEffect } from 'react';
import { 
  Key, Package as PackageIcon, 
  Activity, DollarSign, Download, ShieldAlert,
  Server, RefreshCcw
} from 'lucide-react';
import { Product } from '../schema';

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAWSData = async () => {
    setLoading(true);
    try {
      const [prodRes, logRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/logs')
      ]);
      if (prodRes.ok) setProducts(await prodRes.json());
      if (logRes.ok) setLogs(await logRes.json());
    } catch (err) {
      console.error("Failed to fetch from backend", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAWSData();
  }, []);

  // Sort physical products to the very bottom
  const sortedProducts = [...products].sort((a, b) => {
    if (a.type === 'physical' && b.type !== 'physical') return 1;
    if (a.type !== 'physical' && b.type === 'physical') return -1;
    return 0;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', value: '$218,450.00', icon: DollarSign, color: 'text-emerald-400' },
          { title: 'Keys Dispatched', value: '4,892', icon: Key, color: 'text-blue-400' },
          { title: 'Digital Downloads', value: '18.4K', icon: Download, color: 'text-purple-400' },
          { title: 'API Gateway', value: loading ? 'Syncing...' : '24ms Ping', icon: Server, color: 'text-[#00FF66]' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-2">
              <span className="text-gray-400 text-sm">{stat.title}</span>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <span className="font-display font-medium text-2xl text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Product Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold text-white">Central Product Brain</h2>
            <button 
              onClick={fetchAWSData}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded flex items-center gap-2 transition-colors text-white"
            >
              <RefreshCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Sync DB
            </button>
          </div>
          
          <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left relative">
              <thead className="text-xs text-gray-400 uppercase bg-white/[0.02] border-b border-white/10">
                <tr>
                  <th className="px-5 py-4 font-medium">Product Name</th>
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Security Config</th>
                  <th className="px-5 py-4 font-medium text-right">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-medium text-white">
                      {p.name}
                      <div className="text-xs text-gray-500 mt-0.5">{p.status === 'active' ? 'Active' : 'Inactive'} • ${p.price}</div>
                    </td>
                    <td className="px-5 py-4">
                      {p.type === 'digital' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs font-medium"><Download className="h-3 w-3"/> Digital</span>}
                      {p.type === 'license' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs font-medium"><Key className="h-3 w-3"/> License</span>}
                      {p.type === 'physical' && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-gray-400 text-xs font-medium"><PackageIcon className="h-3 w-3"/> Physical</span>}
                    </td>
                    <td className="px-5 py-4">
                      {p.type === 'digital' && (
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          {p.config?.ipBlock && <span className="flex items-center gap-1 text-emerald-400" title="IP Blocking Active"><ShieldAlert className="h-3 w-3"/> IP</span>}
                          <span>{p.config?.maxDownloads} DLs</span>
                          <span>{p.config?.expirationHours}h Exp</span>
                        </div>
                      )}
                      {p.type === 'license' && (
                         <div className="text-xs text-gray-400">
                           <span className={p.config?.keysAvailable !== undefined && p.config.keysAvailable < 100 ? 'text-orange-400' : 'text-emerald-400'}>
                             {p.config?.keysAvailable?.toLocaleString()} keys left
                           </span>
                         </div>
                      )}
                      {p.type === 'physical' && (
                        <span className="text-xs text-gray-600 italic">No delivery config</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-300 font-mono">
                      {p.sales.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {sortedProducts.length === 0 && !loading && (
                   <tr>
                     <td colSpan={4} className="px-5 py-8 text-center text-gray-500">No products found in database.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Logs Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Activity className="h-5 w-5 text-[#00FF66]" />
              <h2 className="text-xl font-display font-semibold text-white">Live Event Logs</h2>
            </div>
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF66]"></span>
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider ml-1">Polling Queue</span>
            </div>
          </div>
          
          <div className="bg-white/[0.02] border border-white/10 rounded-xl max-h-[500px] overflow-y-auto">
            <div className="divide-y divide-white/5">
              {logs.map((log) => (
                <div key={log.id} className="p-4 px-5 space-y-1 hover:bg-white/[0.01]">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${log.status === 'success' ? 'text-emerald-400' : log.status === 'alert' ? 'text-red-400' : 'text-blue-400'}`}>
                      {log.event}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">{new Date(log.time).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-gray-300">{log.details}</p>
                </div>
              ))}
            </div>
            
            <button className="w-full p-4 text-xs text-gray-500 hover:text-white transition-colors uppercase tracking-wider font-semibold">
              View DynamoDB Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
