export default function OrderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // fixed inset-0 cubre sidebar y padding del dashboard layout (z-50 queda encima de todo)
    return (
        <div className="fixed inset-0 z-50 bg-[#F8F9FA] overflow-hidden">
            {children}
        </div>
    );
}
