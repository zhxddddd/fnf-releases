import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

export const applications = [
  ['clash-verge', 'Clash Verge'],
  ['flclash', 'FlClash'],
  ['clash-meta-android', 'Clash Meta for Android'],
  ['clash-party', 'Clash Party'],
  ['bettbox', 'Bettbox'],
  ['sparkle', 'Sparkle'],
]

export function renderCatalog(releases) {
  const current = {}
  const lines = ['# 按应用查看版本 / Releases by app', '', '各应用按版本号和 FNF 修订号排序。网站同步使用[当前版本清单](releases.json)。', '']
  for (const [id, name] of applications) {
    const pattern = new RegExp('^' + id + '-v(\\d+)\\.(\\d+)\\.(\\d+)-fnf([1-9]\\d*)(-initial-x64)?$')
    const matches = []
    for (const release of releases) {
      if (release.draft || release.prerelease) continue
      const m = pattern.exec(release.tag_name)
      if (!m) continue
      matches.push({tag: m[0], version:'v'+m[1]+'.'+m[2]+'.'+m[3]+'-fnf'+m[4], order:m.slice(1,5).map(Number), initial:Boolean(m[5])})
    }
    matches.sort((a,b) => {
      for(let i=0;i<4;i++) if(a.order[i]!==b.order[i]) return b.order[i]-a.order[i]
      return Number(a.initial)-Number(b.initial)
    })
    const latest = matches.find(m=>!m.initial)
    if (latest) current[id+'-fnf'] = latest.tag
    lines.push('## '+name, '')
    for (const m of matches) {
      const label = m.version + (m.initial ? '（首发 Windows x64 归档）' : '')
      lines.push('- ['+label+'](https://github.com/zhxddddd/fnf-releases/releases/tag/'+m.tag+')'+(m===latest?' · 当前版本':''))
    }
    lines.push('')
  }
  return {'releases.json':JSON.stringify(current,null,2)+'\n','RELEASES.md':lines.join('\n').trimEnd()+'\n'}
}

async function loadReleases() {
  const releases = []
  for (let page=1;;page++) {
    const url = 'https://api.github.com/repos/zhxddddd/fnf-releases/releases?per_page=100&page='+page
    const headers = {Accept:'application/vnd.github+json', 'User-Agent':'fnf-release-catalog'}
    if (process.env.GITHUB_TOKEN) headers.Authorization='Bearer '+process.env.GITHUB_TOKEN
    const result = await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(45000)})
    if(!result.ok) throw Error('Could not read releases (HTTP '+result.status+')')
    const entries = await result.json()
    releases.push(...entries)
    if(entries.length<100) return releases
  }
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  for(const [name,content] of Object.entries(renderCatalog(await loadReleases()))) fs.writeFileSync(name,content)
}
