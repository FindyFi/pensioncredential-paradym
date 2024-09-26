import { createServer } from 'node:http'
import { config, paradym, projectData, templates } from './init.js'
import QRCode from 'qrcode'

const pollingInterval = 3 // seconds

async function createRequest() {
  const openId4VcVerification = await paradym.openId4Vc.verification.createRequest({
    projectId: projectData.id,
    requestBody: {
      presentationTemplateId: templates.presentation.id
    }
  })
  return openId4VcVerification
}

async function showRequest(res) {
  // const id = uuidv4()
  const credentialRequest = await createRequest()
  console.log(credentialRequest)
  const id = credentialRequest.id
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
   const uri = '/status?id=${id}'
   let timer
   async function checkStatus() {
    const resp = await fetch(uri)
    if (resp.status == 200) {
     const status = await resp.json()
     if (status.credentials?.length > 0) {
      clearInterval(timer)
      const credential = status.credentials[0].presentedAttributes
      // console.log(credential)
      const html = \`<p>Todisteen tarkistuksen tila: <strong>\${status.status}</strong></p>
      <table>
      <tr><th>Hetu</th><td>\${credential.personal_administrative_number}</td></tr>
      <tr><th>Eläke</th><td>\${credential.typeCode}</td></tr>
      <tr><th>Alkamispäivä</th><td>\${credential.startDate}</td></tr>
      </table>
      <pre>\${JSON.stringify(status, null, 2)}</pre>\`
      c.innerHTML = html
     }
    }
   }
   timer = setInterval(checkStatus, ${pollingInterval * 1000} )

   </script>
 </body>
</html>`)
}

async function getStatus(id) {
  // const headers = apiHeaders
  const verificationSession = await paradym.openId4Vc.verification.getVerificationSession({
    projectId: projectData.id,
    openId4VcVerificationId: id
  })
  console.log(verificationSession)
  return verificationSession
}

const handleRequests = async function (req, res) {
  const fullUrl = new URL('http://example.com' + req.url) // convert into a full URI for parsing
  let id = fullUrl.searchParams.get('id')
  console.log(fullUrl.pathname, id)
  switch (fullUrl.pathname) {
    case '/status':
      const status = await getStatus(id)
      res.setHeader("Content-Type", "application/json")
      res.writeHead(200)
      res.end(JSON.stringify(status))
      return false
  }
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
