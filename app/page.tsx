'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function IntroPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [fading, setFading]   = useState(false)
  const [imgSrc, setImgSrc]   = useState('/mobile.png')

  useEffect(() => {
    setImgSrc(window.innerWidth >= 768 ? '/tablet.png' : '/mobile.png')

    const shown = sessionStorage.getItem('introShown')
    if (shown) {
      router.replace('/login')
      return
    }

    const t0 = setTimeout(() => setVisible(true), 80)
    const t1 = setTimeout(() => setFading(true), 2200)
    const t2 = setTimeout(() => {
      sessionStorage.setItem('introShown', '1')
      router.replace('/login')
    }, 2800)

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [router])

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        background: '#FDF8F3',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow:   'hidden',
        transition: 'opacity 0.6s ease',
        opacity:    fading ? 0 : visible ? 1 : 0,
      }}
    >
      <Image
        src={imgSrc}
        alt="Alicerce"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        priority
        sizes="100vw"
      />
    </div>
  )
}
