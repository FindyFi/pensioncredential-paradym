import { createServer } from 'node:http'
import { apiHeaders, config, projectData, templates } from './init.js'

console.log(apiHeaders, config, projectData, templates)

async function getOffer(path) {
  const { default: credential } = await import('.' + path, { assert: { type: "json" } });
  // console.log(credential)
  const headers = apiHeaders
  const issueUrl =  `${config.api_base}/v1/projects/${projectData.id}/openid4vc/issuance/offer`
  const credentialOffer = {
    credentials: [
      {
        credentialTemplateId: templates['issue'].id,
        attributes: {
          typeCode: credential.credentialSubject.Pension.typeCode,
          typeName: credential.credentialSubject.Pension.typeName,
          startDate: credential.credentialSubject.Pension.startDate,
          person_identifier_code: credential.credentialSubject.Person.person_identifier_code,
          birth_date: credential.credentialSubject.Person.birth_date,
          given_name_national_characters: credential.credentialSubject.Person.given_name_national_characters,
          family_name_national_characters: credential.credentialSubject.Person.family_name_national_characters
        }
      }
    ]
  }
  if (credential.credentialSubject.Pension.endDate) {
    credentialOffer.credentials[0].attributes.endDate = credential.credentialSubject.Pension.endDate
  }
  if (credential.credentialSubject.Pension.provisional) {
    credentialOffer.credentials[0].attributes.provisional = credential.credentialSubject.Pension.provisional
  }
  // console.log(JSON.stringify(credentialOffer, null, 2))
  const body = JSON.stringify(credentialOffer)
  const resp = await fetch(issueUrl, { method: 'POST', headers, body })
  const json = await resp.json()
  if (resp.status != 200) {
    console.error(json?.message)
    console.log(JSON.stringify(json?.details, null, 1))
  }
  const offerUri = json.offerUri
  // console.log(offerUri)
  return offerUri
}

const sendOffer = async function (req, res) {
  const path = new URL(`http://${config.server_host}${req.url}`).pathname
  if (path.includes('.json')) {
    res.setHeader("Content-Type", "text/plain")
    try {
      const offerUri = await getOffer(path)
      console.log(offerUri)
      res.writeHead(200)
      res.end(offerUri)
      return false
    }
    catch(e) {
      console.error(e)
      res.writeHead(404)
      res.end(`${path} not found!`)
      return false  
    }
  }
  else if (path !== '/') {
    res.setHeader("Content-Type", "text/plain")
    res.writeHead(404)
    res.end(`Not Found`)
    return false
  }
  res.setHeader("Content-Type", "text/html")
  res.writeHead(200)
  res.end(`<!DOCTYPE html>
<html>
 <meta charset="UTF-8">
 <title>Paradym myöntää eläketodisteen</title>
 <script src="https://unpkg.com/@qrcode-js/browser"></script>
 <style>
  #qrcode {
    margin: 1em auto;
  }
 </style>
 <body style="text-align: center;">
  <img src="https://upload.wikimedia.org/wikipedia/en/thumb/6/67/Kela_suomi_kela-1-.jpg/220px-Kela_suomi_kela-1-.jpg" alt="Kela" />
  <h1>Heippa asiakas!</h1>
  <p id="instructions">Tunnistaudu palveluun valitsemalla henkilöllisyytesi valintalistasta:</p>
  <form id="idSelector">
   <select name="identity">
   <option value="pensioncredential.json">Totti Aalto (KAEL)</option>
   <option value="pensioncredential-provisional.json">Edwin Kelimtes (väliaikainen TKEL)</option>
   <option value="pensioncredential-disability.json">Joni Kai Hiltunen (TKEL)</option>
   <option value="pensioncredential-rehabilitation.json">Jonne Aapeli Setälä (KUKI)</option>
   <option value="pensioncredential-rehabilitation-expired.json">Annina von Forsellestes (päättynyt KUKI)</option>
   </select>
   <input type="submit" value="Vahvista" />
  </form>
  <canvas id="qrcode"></canvas>
  <p id="offer">Valmistellaan...</p>
  <script>

   const a = document.createElement('a')
   a.textContent = 'Kopioi todistetarjous leikepöydälle.'
   const o = document.querySelector('#offer')

   const f = document.querySelector('#idSelector')
   f.onsubmit = async function(e) {
    e.preventDefault()
    const file = this.identity.value
    console.log(file)
    const resp = await fetch(file)
    let qrUrl = await resp.text()
    console.log(qrUrl)
    const canvas = document.getElementById("qrcode")
    const qr = QRCode.QRCodeBrowser(canvas)
    qr.setOptions({
      text: qrUrl,
      size: 256,
    })
    qr.draw()
    document.querySelector('#instructions').textContent = 'Skannaapa oheinen QR-koodi digikukkarollasi niin laitetaan sinne eläketodiste tulemaan...'
    a.href = qrUrl
    a.onclick = function(e) {
     e.preventDefault()
     console.log(qrUrl)
     console.log(this.href)
     try {
      navigator.clipboard.writeText(this.href)
     } catch (error) {
      console.error(error.message)
     }
    }
    // document.querySelector('#qrcode').onnoclick = () => {document.location.href = qrUrl}
    o.textContent = ''
    o.appendChild(a)
   }
  </script>
 </body>
</html>`)
}

const server = createServer(sendOffer)
server.listen(config.issuer_port, config.server_host, () => {
  console.log(`Server is running on http://${config.server_host}:${config.issuer_port}`)
})
