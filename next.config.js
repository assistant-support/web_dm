/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            }
        ],
    },
    output: 'standalone',
    experimental: {
        serverActions: {
            bodySizeLimit: '5mb',
        },
    },
}

export default nextConfig;