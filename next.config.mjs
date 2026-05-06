/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsHmrCache: false,
        serverActions: {
            bodySizeLimit: '10mb', 
        },
    },

    images:{
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'eiobpkegpoxyrnvwjayt.supabase.co',
                pathname: '/storage/v1/**',
            },
        ],       
    
    },
};

export default nextConfig;
