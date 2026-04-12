import Link from "next/link";

interface Props {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function ToolCard({ href, title, description, icon }: Props) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-lg hover:border-accent/30 transition-all duration-200 hover:scale-[1.02]"
    >
      <div className="text-accent mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-accent transition-colors">
        {title}
      </h2>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
