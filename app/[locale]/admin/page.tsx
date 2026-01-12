import { getAllPosts } from '@/lib/modules/blog/admin-io';
import Link from 'next/link';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = await getAllPosts();
  
  const stats = {
    total: posts.length,
    public: posts.filter(p => p.visibility === 'public').length,
    draft: posts.filter(p => p.visibility === 'draft').length,
    private: posts.filter(p => p.visibility === 'private').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Welcome to your blog admin panel
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Posts</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.public}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.draft}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Private</p>
          <p className="text-3xl font-bold text-gray-600 mt-1">{stats.private}</p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            href={`/${locale}/admin/posts/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
          <Link
            href={`/${locale}/admin/categories`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Manage Categories
          </Link>
        </div>
      </div>
      
      {/* Recent Posts */}
      {posts.length > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Posts</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {posts.slice(0, 5).map((post) => (
              <div key={post.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{post.title_en}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                    post.visibility === 'public' ? 'bg-green-100 text-green-700' :
                    post.visibility === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {post.visibility}
                  </span>
                </div>
                <Link
                  href={`/${locale}/admin/posts/${post.id}/edit`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
