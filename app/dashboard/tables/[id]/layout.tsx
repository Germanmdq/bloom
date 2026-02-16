export default function OrderLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Este layout reemplaza al layout principal del dashboard para esta ruta anidada
    // permitiendo utilizar el 100% del ancho de pantalla sin el Sidebar lateral.
    return (
        <div className="h-screen w-full bg-gray-50 overflow-hidden">
            {children}
        </div>
    );
}
