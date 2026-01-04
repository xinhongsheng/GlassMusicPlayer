import axios, {
    AxiosInstance,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios'
import NProgress from '@/config/nprogress'

const baseURL = import.meta.env.VITE_APP_BASE_API
const isLocalhost = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')
const mediaProxyPrefix = import.meta.env.VITE_MEDIA_PROXY || ''
const mediaHostRe = /(^|\.)music\.126\.net$|(^|\.)music\.163\.com$/i
const audioExtRe = /\.(mp3|m4a|flac|aac|wav|ogg|ape)(\?|$)/i

const normalizeMediaUrl = (value: string): string => {
    if (!value || typeof value !== 'string') return value
    if (!value.startsWith('http://') && !value.startsWith('https://')) return value
    if (mediaProxyPrefix && value.startsWith(mediaProxyPrefix)) return value

    let url: URL
    try {
        url = new URL(value)
    } catch {
        return value
    }

    if (!mediaHostRe.test(url.hostname)) return value

    const httpsUrl = value.replace(/^http:\/\//i, 'https://')
    const isAudio =
        audioExtRe.test(url.pathname) ||
        (url.hostname.endsWith('music.163.com') && url.pathname.startsWith('/song/media/outer/url'))

    if (!mediaProxyPrefix || !isAudio) return httpsUrl
    return `${mediaProxyPrefix}${encodeURIComponent(httpsUrl)}`
}

const normalizeMediaUrlsDeep = (input: any, seen = new WeakSet<object>()): any => {
    if (typeof input === 'string') return normalizeMediaUrl(input)
    if (!input || typeof input !== 'object') return input
    if (seen.has(input)) return input
    seen.add(input)

    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            input[i] = normalizeMediaUrlsDeep(input[i], seen)
        }
        return input
    }

    for (const key of Object.keys(input)) {
        input[key] = normalizeMediaUrlsDeep(input[key], seen)
    }
    return input
}

const instance: AxiosInstance = axios.create({
    baseURL,
    timeout: 1000000,
    withCredentials: isLocalhost, // 仅本地开发时启用凭证
})

// 请求拦截器
instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 开启进度条
        NProgress.start()
        if (config.params === undefined) {
            config.params = {}
        }
        // 添加或修改params
        Object.assign(config.params, {
            timestamp: Date.now(),
            realIP: '116.25.146.177',
        })
        return config
    },
    (error) => Promise.reject(error)
)

// 响应拦截器
instance.interceptors.response.use(
    (response: AxiosResponse) => {
        const { data } = response
        normalizeMediaUrlsDeep(data)

        // 进度条结束
        NProgress.done()
        return data
    },
    (error) => {
        // 响应错误时也结束进度条
        NProgress.done()
        return Promise.reject(error)
    }
)

// 封装get方法
export const httpGet = <T>(url: string, params?: object): Promise<T> =>
    instance.get(url, { params })

// 封装post方法
export const httpPost = <T>(
    url: string,
    data?: object,
    header?: object
): Promise<T> => instance.post(url, data, header)

// 封装upload方法
export const httpUpload = <T>(
    url: string,
    formData: FormData,
    header?: object
): Promise<T> => {
    return instance.post(url, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            ...header,
        },
    })
}
