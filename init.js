import config from './config.json' assert {'type': 'json'}

// override config file with environment variables
for (const param in config) {
    if (process.env[param] !== undefined) {
        config[param] = process.env[param]
    }
}

const apiHeaders = {
    'X-Access-Token': config.api_key,
    'Content-Type': 'application/json'
}

const projectData = await initProject('pensionDemo')
// console.log(projectData)
const templates = {}
templates.issue = await createIssuanceTemplate(),
templates.verify = await createVerificationTemplate()
// console.log(templates)

export { config, apiHeaders, projectData, templates }

async function initProject(name) {
  const headers = apiHeaders
  const url = config.api_base + '/v1/projects?search[name]=' + encodeURIComponent(name)
  const resp = await fetch(url, { headers })
  const json = await resp.json()
  if (json?.data?.at(0)?.id) {
    // console.log(json.data)
    return json.data[0]
  }
  const createUrl = config.api_base + '/v1/projects?search[name]=' + encodeURIComponent(name)
  const body = JSON.stringify({name})
  // console.log(body)
  const createResp = await fetch(createUrl, { method: 'POST', headers, body })
  const createJSON = await createResp.json()
  // console.log(createJSON)
  return await createJSON
}

async function createIssuanceTemplate() {
  const headers = apiHeaders
  const getUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/credentials/sd-jwt-vc`
  const resp = await fetch(getUrl, { headers })
  const json = await resp.json()
  if (json.data) {
    for (const tmpl of json.data) {
      if (tmpl.name == 'pensionCredential') {
        // const delUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/credentials/sd-jwt-vc/${tmpl.id}`
        // await fetch(delUrl, { method: 'DELETE', headers })
        return tmpl
      }
    }
  }

  const createUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/credentials/sd-jwt-vc`
  const template = {
    type: "PensionCredential",
    name: 'pensionCredential',
    description: 'Proof of pensioner status',
    validFrom: new Date().toISOString().substring(0, 10),
    validUntil: {
      start: "validFrom",
      future: {
        "years": 3
      }
    },
    revocable: false,
    attributes: {
      "endDate": {
        "type": "date",
        "name": "End date",
        "description": "The last date when a temporary pension benefit will be paid.",
        "required": false,
        "alwaysDisclosed": false
      },
      "startDate": {
        "type": "date",
        "name": "Start date",
        "description": "The date when the pension is paid to the beneficiary for the first time.",
        "required": true,
        "alwaysDisclosed": false
      },
      "provisional": {
        "type": "boolean",
        "name": "Provisional",
        "description": "True if the pension decision is not confimed yet.",
        "required": false,
        "alwaysDisclosed": true
      },
      "typeCode": {
        "type": "string",
        "name": "Type (code)",
        "description": "Short code representing the type of the pension benefit.",
        "required": true,
        "alwaysDisclosed": false
      },
      "typeName": {
        "type": "string",
        "name": "Type",
        "description": "Human-readable type of the pension benefit.",
        "required": true,
        "alwaysDisclosed": false
      },
      "birth_date": {
        "type": "string",
        "name": "Birth date",
        "description": "Credential subject's date of birth.",
        "required": true,
        "alwaysDisclosed": false
      },
      "given_name_national_characters": {
        "type": "string",
        "name": "Given name",
        "description": "Credential subject's first name.",
        "required": true,
        "alwaysDisclosed": false
      },
      "family_name_national_characters": {
        "type": "string",
        "name": "Family name",
        "description": "Credential subject's last name.",
        "required": true,
        "alwaysDisclosed": false
      },
    },
    background: {
      color: "#0d0342",
    },
    text: {
      color: "#ffebd2"
    },  
  }
  const body = JSON.stringify(template)
  const createResp = await fetch(createUrl, { method: 'POST', headers, body })
  const createJson = await createResp.json()
  return createJson  
}

async function createVerificationTemplate() {
    const headers = apiHeaders
    const getUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/presentations?search[name]=pensionCredential`
    const resp = await fetch(getUrl, { headers })
    const json = await resp.json()
    if (json.data[0]) {
      // const delUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/presentations/${json.data[0].id}`
      // await fetch(delUrl, { method: 'DELETE', headers })
      return json.data[0]
    }
  
    const createUrl =  `${config.api_base}/v1/projects/${projectData.id}/templates/presentations`
    const template = {
      name: 'PensionCredential',
      description: 'Proof of pensioner status',
      credentials: [
        {
          format: 'sd-jwt-vc',
          type: templates.issue.type,
          attributes: {
            "startDate": {
              "type": "date",
            },
            "typeCode": {
              "type": "string",
            },
            "birth_date": {
              "type": "string",
            },
            "given_name_national_characters": {
              "type": "string",
            },
            "family_name_national_characters": {
              "type": "string",
            },
          }
        }
      ]
    }
    const body = JSON.stringify(template)
    const createResp = await fetch(createUrl, { method: 'POST', headers, body })
    const createJson = await createResp.json()
    return createJson  
  }
  