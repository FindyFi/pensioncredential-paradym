import config from './config.json' with {'type': 'json'}
import Paradym from '@paradym/sdk';

// override config file with environment variables
for (const param in config) {
  if (process.env[param] !== undefined) {
    config[param] = process.env[param]
  }
}

const templates = {}
let projectData = {}

const paradym = new Paradym.Paradym({
  apiKey: config.api_key
});

const apiHeaders = {
  'X-Access-Token': config.api_key,
  'Content-Type': 'application/json'
}

// const projects = await paradym.projects.getAllProjects({'search': {'name': 'pensionDemo'}})
const projects = await paradym.projects.getAllProjects({'searchNme': 'pensionDemo'})
for (const project of projects.data) {
  if (project.name == 'pensionDemo') {
    projectData = project
  }
}
if (!projectData) {
  projectData = paradym.projects.createProject({name: 'pensionDemo'})
}
// console.log(projectData)

templates['issuance'] = await paradym.templates.credentials.sdJwtVc.createCredentialTemplate({
  projectId: projectData.id,
  requestBody: {
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
      "ppersonal_administrative_number": {
        "type": "string",
        "name": "Person identifier",
        "description": "Credential subject's identifier (HETU).",
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
      "given_name": {
        "type": "string",
        "name": "Given name",
        "description": "Credential subject's first name.",
        "required": true,
        "alwaysDisclosed": false
      },
      "family_name": {
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
})

templates['presentation'] = await paradym.templates.presentations.createPresentationTemplate({
  projectId: projectData.id,
  requestBody: {
    name: templates.issuance.name,
    description: templates.issuance.description,
    credentials: [
      {
        type: templates.issuance.type,
        name: templates.issuance.name,
        description: templates.issuance.description,
        format: 'sd-jwt-vc',
        attributes: {
          "startDate": {
            "type": "date",
          },
          "typeCode": {
            "type": "string",
          },
          "personal_administrative_number": {
            "type": "string",
          },
        }
      }
    ]
  }
})

export { config, paradym, projectData, templates }

async function initProject(name) {
  const createUrl = config.api_base + '/v1/projects?search[name]=' + encodeURIComponent(name)
  const body = JSON.stringify({name})
  const createResp = await fetch(createUrl, { method: 'POST', headers, body })
  const createJSON = await createResp.json()
  // console.log(createJSON)
  return await createJSON
}

/*
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
      "ppersonal_administrative_number": {
        "type": "string",
        "name": "Person identifier",
        "description": "Credential subject's identifier (HETU).",
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
      "given_name": {
        "type": "string",
        "name": "Given name",
        "description": "Credential subject's first name.",
        "required": true,
        "alwaysDisclosed": false
      },
      "family_name": {
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
    if (json?.data?.at(0)) {
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
            "ppersonal_administrative_number": {
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
  */
