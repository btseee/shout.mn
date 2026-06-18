import { useEffect } from 'react'

interface PageMetaOptions {
  title: string
  description?: string
  image?: string
  url?: string
}

const BASE_TITLE = 'shout.mn'

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"], meta[name="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    const attr = property.startsWith('og:') || property.startsWith('twitter:') ? 'property' : 'name'
    el.setAttribute(attr, property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function usePageMeta({ title, description, image, url }: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${BASE_TITLE}` : BASE_TITLE
    document.title = fullTitle
    setMeta('og:title', fullTitle)
    setMeta('twitter:title', fullTitle)

    if (description) {
      setMeta('description', description)
      setMeta('og:description', description)
      setMeta('twitter:description', description)
    }
    if (image) {
      setMeta('og:image', image)
      setMeta('twitter:image', image)
    }
    if (url) {
      setMeta('og:url', url)
    }
  }, [title, description, image, url])
}
