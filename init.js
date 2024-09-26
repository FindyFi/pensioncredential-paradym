import config from './config.json' with {'type': 'json'}
import Paradym from '@paradym/sdk';

// override config file with environment variables
for (const param in config) {
  if (process.env[param] !== undefined) {
    config[param] = process.env[param]
  }
}

const projectName = "pensionDemo"
const typeName = "PensionCredential-2024-09-26"
const templates = {}
let projectData = {}

const paradym = new Paradym.Paradym({
  apiKey: config.api_key
});

const apiHeaders = {
  'X-Access-Token': config.api_key,
  'Content-Type': 'application/json'
}

const projects = await paradym.projects.getAllProjects({'searchName': projectName})
for (const project of projects.data) {
  if (project.name == projectName) {
    projectData = project
  }
}
if (!projectData) {
  projectData = paradym.projects.createProject({name: projectName})
}

templates['issuance'] = await paradym.templates.credentials.sdJwtVc.createCredentialTemplate({
  projectId: projectData.id,
  requestBody: {
    type: typeName,
    name: 'Eläketodiste',
    description: 'Todiste siitä, että saat Kelan eläke-etuutta',
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
      "personal_administrative_number": {
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
        // description: templates.issuance.description,
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
