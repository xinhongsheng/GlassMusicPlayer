import { defineConfig, loadEnv, type Plugin } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { Readable } from 'node:stream'
import { wrapperEnv } from './build/getEnv'
import { createProxy } from './build/proxy'
import { createVitePlugins } from './build/plugins'

const mediaProxyPlugin = (): Plugin => ({
  name: 'dev-media-proxy',
  configureServer(server) {
    server.middlewares.use('/media', async (req, res) => {
      const requestUrl = new URL(req.url || '', 'http://localhost')
      const target = requestUrl.searchParams.get('url')

      if (!target) {
        res.statusCode = 400
        res.end('Missing url')
        return
      }

      try {
        const response = await fetch(target, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://music.163.com/',
          },
        })

        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          const lowerKey = key.toLowerCase()
          if (lowerKey === 'content-encoding' || lowerKey === 'content-length') return
          if (lowerKey === 'transfer-encoding' || lowerKey === 'connection') return
          res.setHeader(key, value)
        })
        res.setHeader('Access-Control-Allow-Origin', '*')

        if (response.body) {
          Readable.fromWeb(response.body as any).pipe(res)
        } else {
          res.end()
        }
      } catch (error) {
        res.statusCode = 502
        res.end('Bad Gateway')
      }
    })
  },
})

export default defineConfig(({ mode }) => {
  const root = process.cwd()
  const env = loadEnv(mode, root)
  const viteEnv = wrapperEnv(env)

  return {
    plugins: [...createVitePlugins(viteEnv), mediaProxyPlugin()],
    server: {
      port: 5089,
      host: true,
      // 代理配置
      proxy: createProxy(viteEnv.VITE_PROXY),
    },
    
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    base: viteEnv.VITE_PUBLIC_PATH,
    build: {
      rollupOptions: {
        // 静态资源分类打包
        output: {
          entryFileNames: 'static/js/[name]-[hash].js',
          chunkFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          // 静态资源分拆打包
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.toString().indexOf('.pnpm/') !== -1) {
                return id.toString().split('.pnpm/')[1].split('/')[0].toString()
              } else if (id.toString().indexOf('node_modules/') !== -1) {
                return id.toString().split('node_modules/')[1].split('/')[0].toString()
              }
            }
          },
        },
      },
    },
  }
})
