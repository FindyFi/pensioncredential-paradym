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

const projects = await paradym.projects.getAllProjects({searchName: config.project_name})
for (const project of projects.data.data) {
  if (project.name == config.project_name) {
    projectData = project
  }
}
if (!projectData) {
  projectData = paradym.projects.createProject({ body: {name: config.project_name}})
}

const trustedEntities = {}
// console.log(projectData)
const entities = await paradym.trustedEntities.getAllTrustedEntities({path: {projectId: projectData.id}})
// console.log(entities.data.data)

for (const e of entities.data.data) {
  if (e.name == 'Kela') {
    trustedEntities.issuer = e
    continue
  }
  if (e.name == 'HSL') {
    trustedEntities.verifier = e
  }
}
if (!trustedEntities.issuer) {
  trustedEntities.issuer = await paradym.trustedEntities.createTrustedEntity({
    path: {
      projectId: projectData.id
    },
    body: {
      name: 'Kela',
      dids: [{
        name: 'Kela',
        did: 'did:web:kela.pensiondemo.findy.fi'
      }]
    }
  })
}
if (!trustedEntities.verifier) {
  trustedEntities.verifier = await paradym.trustedEntities.createTrustedEntity({
    path: {
      projectId: projectData.id
    },
    body: {
      name: 'HSL',
      dids: [{
        name: 'HSL verifier',
        did: 'did:web:hsl.pensiondemo.findy.fi'
      }]
    }
  })
}

const credentialTemplates = await paradym.templates.credentials.sdJwtVc.getAllCredentialTemplates({
  path: {
    projectId: projectData.id
  }
})
for (const t of credentialTemplates.data.data) {
  if (t.name == config.credential_name) {
    templates.issuance = t
    break
  }
}
if (!templates.issuance) {
  const issuanceTemplate = await paradym.templates.credentials.sdJwtVc.createCredentialTemplate({
    path: {
      projectId: projectData.id
    },
    body: {
      type: config.credential_type,
      name: config.credential_name,
      description: config.credential_description,
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
  templates.issuance = issuanceTemplate.data
}

const verificationTemplates = await paradym.templates.presentations.getAllPresentationTemplates({
  path: {
    projectId: projectData.id
  }
})
for (const t of verificationTemplates.data.data) {
  if (t.name == templates.issuance.name + '-presentation') {
    templates.presentation = t
    break
  }
}

if (!templates.presentation) {
  const presentationTemplate = await paradym.templates.presentations.createPresentationTemplate({
    path: {
      projectId: projectData.id
    },
    body: {
      name: templates.issuance.name + '-presentation',
      description: templates.issuance.description,
      credentials: [
        {
          type: templates.issuance.type,
          name: templates.issuance.name,
          // description: templates.issuance.description,
          format: 'sd-jwt-vc',
          // trustedIssuers: [trustedEntities.issuer.id],
          trustedIssuers: [],
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
  templates.presentation = presentationTemplate.data
}

// console.log(JSON.stringify(templates, null, 2))

export { config, paradym, projectData, templates }
