import config from './config.json' with {'type': 'json'}
import credentialschema from './credentialschema.json' with {'type': 'json'}
import { Paradym } from '@paradym/sdk';

// override config file with environment variables
for (const param in config) {
  if (process.env[param] !== undefined) {
    config[param] = process.env[param]
  }
}

const templates = {}
let projectData = {}

const paradym = new Paradym({
  apiKey: config.api_key
});

const apiHeaders = {
  'X-Access-Token': config.api_key,
  'Content-Type': 'application/json'
}

const projects = await paradym.projects.getAllProjects({})
for (const project of projects.data.data) {
  if (project.name == config.project_name) {
    projectData = project
    break
  }
}
if (!projectData) {
  const newProject = await paradym.projects.createProject({ body: {
    name: config.project_name,

  }})
  if (newProject) {
    projectData = newProject.data
  }
}

const trustedEntities = {}
// console.log(projectData)
const entities = await paradym.trustedEntities.getAllTrustedEntities({path: {projectId: projectData.id}})

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
    body: credentialschema
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
            "effectual": {
              "type": "boolean",
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
