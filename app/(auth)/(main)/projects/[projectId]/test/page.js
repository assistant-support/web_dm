// Test page
export const dynamic = 'force-dynamic';

export default async function TestPage({ params }) {
    const { projectId } = await params;
    
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Test Page Working!</h1>
            <p>Project ID: {projectId}</p>
        </div>
    );
}
