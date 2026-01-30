/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 's240-ava-talk.zadn.vn',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'www.dropbox.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**.zadn.vn',
                pathname: '/**',
              },
            {
                protocol: 'https',
                hostname: 'placehold.co',
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
};

export default nextConfig;
