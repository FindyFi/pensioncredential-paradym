import { createServer } from 'node:http'
import { apiHeaders, config, projectData, templates } from './init.js'
import QRCode from 'qrcode'

const states = {}
const pollingInterval = 3 // seconds

async function createRequest() {
  const headers = apiHeaders
  const verifyUrl =  `${config.api_base}/v1/projects/${projectData.id}/openid4vc/verification/request`
  const body = JSON.stringify({
    "presentationTemplateId": templates['verify'].id
  })
  const resp = await fetch(verifyUrl, { method: 'POST', headers, body })
  if (resp.status != 200) {
    console.error(resp.status, verifyUrl, JSON.stringify(requestParams, null, 1))
  }
  const json = await resp.json()
  console.log(json)
  return json
}

async function showRequest(res) {
  // const id = uuidv4()
  const credentialRequest = await createRequest()
  const dataURL = await QRCode.toDataURL(credentialRequest.authorizationRequestUri)
  res.setHeader("Content-Type", "text/html")
  res.writeHead(200)
  res.end(`<!DOCTYPE html>
<html>
 <meta charset="UTF-8">
 <style>
  table {
    max-width: 30em;
    margin: 1em auto;
  }
  th, td {
    text-align: left;
  }
  pre {
    background-color: black;
    color: green;
    display: none;
    text-align: left;
  }
  #content.full pre {
    display: block;
  }
 </style>
 <body style="text-align: center;">
  <img src="https://cdn-assets-cloud.frontify.com/s3/frontify-cloud-files-us/eyJwYXRoIjoiZnJvbnRpZnlcL2FjY291bnRzXC8yZFwvMTkyOTA4XC9wcm9qZWN0c1wvMjQ5NjY1XC9hc3NldHNcLzAwXC80NTY4NzI2XC81MjA2ODk2MDdmZGRkYjBlMDEwMDhiOTVlMTk1OTRjMS0xNTk1NDI3ODE5LnN2ZyJ9:frontify:ToCDM7NDPWebZDLJcmAgDwA_EsA9XJBl3YroZI1XhA0?width=240" alt="HSL" />
  <h1>Heippa vahvasti tunnistettu asiakas!</h1>
  <div id="content">
   <p>Lähetäpä eläketodiste niin tsekataan, että sinulla on oikeus eläkealennukseen...</p>
   <a href="${credentialRequest.authorizationRequestUri}"><img src="${dataURL}" alt="Credential Request QR Code" /></a>
  </div>
  <script>
   const c = document.querySelector('#content')

   const a = document.createElement('a')
   a.textContent = 'Kopioi todistepyyntö leikepöydälle.'
   a.href = '${credentialRequest.authorizationRequestUri}'
   a.style.display = 'block'
   a.onclick = function(e) {
    e.preventDefault()
    try {
     navigator.clipboard.writeText(this.href)
    } catch (error) {
     console.error(error.message)
    }
   }
   // document.querySelector('#qrcode').onnoclick = () => {document.location.href = qrUrl}
   const o = document.querySelector('#offer')
   c.appendChild(a)
  </script>
 </body>
</html>`)
}

function renderCredential(credential) {
  const html = `<table>
  <tr><th>Nimi</th><td>${credential.Person?.givenName} ${credential.Person?.familyName}</td></tr>
  <tr><th>Eläke</th><td>${credential.Pension?.typeName} ${credential.Pension?.typeCode} ${credential.Pension?.statusCode || ''}</td></tr>
  </table>`
  return html
}

const handleRequests = async function (req, res) {
  if (req.url !== '/') {
    res.setHeader("Content-Type", "text/plain")
    res.writeHead(404)
    res.end(`Not Found`)
    return false
  }
  await showRequest(res)
}

const server = createServer(handleRequests)
server.listen(config.verifier_port, config.server_host, () => {
    console.log(`Server is running on http://${config.server_host}:${config.verifier_port}`)
})
