import AdminTabs from "@/components/admin/common/AdminTabs";

const BLOG_TABS = [
  { href: "/admin/posts", label: "文章管理" },
  { href: "/admin/categories", label: "分類管理" },
  { href: "/admin/groups", label: "主題群組" },
  { href: "/admin/topics", label: "子主題" },
  { href: "/admin/tags", label: "標籤" },
  { href: "/admin/comments", label: "留言管理" },
];

export default async function BlogLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div>
      <AdminTabs locale={locale} items={BLOG_TABS} />
      {children}
    </div>
  );
}
