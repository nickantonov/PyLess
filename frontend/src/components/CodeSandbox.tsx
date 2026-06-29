// Copyright (c) 1998-2026 Nick Antonov (nick.antonov1@gmail.com) / Borodachamba Studio. All rights reserved.
import { useRef, useEffect, useCallback, useState } from 'react'
import type { TaskLanguage } from '../types'

interface Props {
  code: string
  language: TaskLanguage
  onOutput: (output: string) => void
  onTestRun: (code: string) => Promise<{ passed: boolean; expected: string; got: string }[]>
  tests?: { input: string; expected: string }[]
}

function buildHtmlDoc(code: string, language: TaskLanguage): string {
  if (language === 'html') {
    return `<!DOCTYPE html>
<html><head><style>body{font-family:system-ui;padding:16px;margin:0;}</style></head>
<body>${code}</body></html>`
  }

  if (language === 'css') {
    return `<!DOCTYPE html>
<html><head><style>body{font-family:system-ui;padding:16px;margin:0;}</style></head>
<body>
<div style="padding:8px;border:1px solid #ccc;margin:8px 0"><h1>Заголовок</h1></div>
<div style="padding:8px;border:1px solid #ccc;margin:8px 0"><p>Параграф</p></div>
<div style="padding:8px;border:1px solid #ccc;margin:8px 0"><a href="#">Посилання</a></div>
<div style="padding:8px;border:1px solid #ccc;margin:8px 0"><ul><li>Елемент 1</li><li>Елемент 2</li></ul></div>
<div style="padding:8px;border:1px solid #ccc;margin:8px 0"><button>Кнопка</button></div>
<style>${code}</style>
</body></html>`
  }

  if (language === 'javascript') {
    return `<!DOCTYPE html>
<html><head></head><body>
<script>
const __output = [];
const __origLog = console.log;
console.log = (...args) => __output.push(args.map(String).join(' '));
try {
${code}
} catch(e) {
  __output.push('ERROR: ' + e.message);
}
console.log = __origLog;
window.parent.postMessage({ type: 'js-output', data: __output.join('\\n') }, '*');
</script>
</body></html>`
  }

  if (language === 'react') {
    return `<!DOCTYPE html>
<html><head>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>body{font-family:system-ui;padding:16px;margin:0;} *{box-sizing:border-box;}</style>
</head><body>
<div id="root"></div>
<script type="text/babel">
const __output = [];
const __origLog = console.log;
console.log = (...args) => __output.push(args.map(String).join(' '));
try {
${code}
const __root = ReactDOM.createRoot(document.getElementById('root'));
if (typeof App !== 'undefined') __root.render(React.createElement(App));
else if (typeof Component !== 'undefined') __root.render(React.createElement(Component));
else {
  const scripts = document.querySelectorAll('script[type="text/babel"]');
  const last = scripts[scripts.length - 1];
  if (last) eval(last.textContent);
}
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="color:red">Error: ' + e.message + '</pre>';
}
console.log = __origLog;
setTimeout(() => window.parent.postMessage({ type: 'js-output', data: __output.join('\\n') }, '*'), 500);
</script>
</body></html>`
  }

  return code
}

function buildTestCode(tests: { input: string; expected: string }[], language: TaskLanguage): string {
  if (language === 'html') {
    return tests.map(t => {
      const el = t.input
      return `document.querySelector('${el}') !== null`
    }).join(' && ')
  }
  if (language === 'css') {
    return tests.map(t => {
      const [sel, prop, val] = t.input.split('|')
      return `getComputedStyle(document.querySelector('${sel}')).${prop} === '${val}'`
    }).join(' && ')
  }
  return ''
}

export default function CodeSandbox({ code, language, onOutput, tests }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)

  const html = buildHtmlDoc(code, language)

  useEffect(() => {
    setReady(false)
    const timer = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(timer)
  }, [html])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'js-output') {
        onOutput(e.data.data || '')
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onOutput])

  const runTests = useCallback(async () => {
    if (!tests || tests.length === 0 || !iframeRef.current) return []

    const results: { passed: boolean; expected: string; got: string }[] = []

    if (language === 'html') {
      for (const test of tests) {
        try {
          const doc = iframeRef.current.contentDocument
          const found = doc?.querySelector(test.input) !== null
          results.push({ passed: found, expected: test.expected, got: found ? test.input : '' })
        } catch {
          results.push({ passed: false, expected: test.expected, got: '' })
        }
      }
    } else if (language === 'css') {
      for (const test of tests) {
        const [sel, prop, val] = test.input.split('|')
        try {
          const doc = iframeRef.current.contentDocument
          const el = doc?.querySelector(sel)
          if (el) {
            const got = getComputedStyle(el).getPropertyValue(prop).trim()
            results.push({ passed: got === val, expected: val, got })
          } else {
            results.push({ passed: false, expected: val, got: 'element not found' })
          }
        } catch {
          results.push({ passed: false, expected: val, got: '' })
        }
      }
    } else {
      for (const test of tests) {
        results.push({ passed: false, expected: test.expected, got: 'manual check' })
      }
    }
    return results
  }, [tests, language])

  if (language === 'javascript' || language === 'react') {
    return (
      <div className="w-full h-full">
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="code-sandbox"
        />
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      {ready && (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="code-sandbox"
        />
      )}
    </div>
  )
}
