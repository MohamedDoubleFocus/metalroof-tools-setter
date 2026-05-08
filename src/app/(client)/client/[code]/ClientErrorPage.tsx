interface Props {
  title: string;
  message: string;
}

export default function ClientErrorPage({ title, message }: Props) {
  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-7 h-7 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 leading-relaxed">{message}</p>
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Besoin d&apos;aide ?
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-1">
            (514) 867-0787
          </p>
        </div>
      </div>
    </div>
  );
}
