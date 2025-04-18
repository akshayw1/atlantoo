const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

async function main() {
  try {
    // Get incident ID from environment
    const incidentId = process.env.INCIDENT_ID;
    if (!incidentId) {
      throw new Error('No incident ID provided');
    }
    
    console.log(`Processing incident: ${incidentId}`);
    
    // Fetch incident details from API
    const incident = await getIncidentDetails(incidentId);
    console.log('Incident details retrieved');
    
    // Extract information from incident
    const { errorLocation, serviceName } = incident;
    if (!errorLocation || !serviceName) {
      throw new Error('Incident lacks required error location or service name');
    }
    
    // Clone the affected repository
    const repoName = serviceName;
    const repoOrg = 'akshayw1'; // Your GitHub org/username
    
    console.log(`Cloning repository: ${repoOrg}/${repoName}`);
    execSync(`git clone https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${repoOrg}/${repoName}.git`);
    
    // Create a new branch
    const branchName = `fix-${incidentId.substring(0, 10)}`;
    process.chdir(repoName);
    execSync(`git checkout -b ${branchName}`);
    
    // Find the file containing the method
    const { methodName } = errorLocation;
    console.log(`Looking for file containing method: ${methodName}`);
    
    const filePath = findFileUsingGrep(methodName);
    if (!filePath) {
      throw new Error(`Could not find file containing method: ${methodName}`);
    }
    
    console.log(`Found file at: ${filePath}`);
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Send to AI for fixing
    const fixedContent = await getAIFix(fileContent, incident);
    
    // Write fixed content back to file
    fs.writeFileSync(filePath, fixedContent);
    
    // Commit and push changes
    execSync('git config user.name "Observability Bot"');
    execSync('git config user.email "observability-bot@example.com"');
    execSync(`git add ${filePath}`);
    execSync(`git commit -m "Fix ${errorLocation.exceptionType} in ${methodName} - Incident #${incidentId}"`);
    execSync(`git push origin ${branchName}`);
    
    // Create PR
    const prTitle = `Fix ${errorLocation.exceptionType} in ${methodName}`;
    const prBody = createPRDescription(incident);
    
    const pr = await octokit.pulls.create({
      owner: repoOrg,
      repo: repoName,
      title: prTitle,
      body: prBody,
      head: branchName,
      base: 'main' // or your default branch
    });
    
    console.log(`Successfully created PR: ${pr.data.html_url}`);
    
  } catch (error) {
    console.error(`Error processing incident: ${error.message}`);
    process.exit(1);
  }
}

function findFileUsingGrep(methodName) {
  try {
    // Using grep to find the file with the method name
    const grepResult = execSync(`grep -r "${methodName}" --include="*.java" .`).toString();
    console.log(`grep result: ${grepResult}`);
    
    // Parse the grep output to extract the file path
    const lines = grepResult.split('\n').filter(line => line.trim() !== '');
    
    // Look for non-binary matches
    for (const line of lines) {
      // Skip binary files
      if (line.includes('Binary file')) continue;
      
      // Extract the file path from the grep result
      // Format is typically: ./path/to/file.java:content
      const filePath = line.split(':')[0];
      if (filePath && fs.existsSync(filePath)) {
        return filePath;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error using grep: ${error.message}`);
    return null;
  }
}

async function getIncidentDetails(incidentId) {
  try {
    const response = await axios.post(
      `http://88.99.104.97:3002/api/analyze/incidents/${incidentId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch incident details: ${error.message}`);
  }
}

async function findFile(fileName) {
  // Simple recursive search for the file
  function searchRecursively(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        const result = searchRecursively(filePath);
        if (result) return result;
      } else if (file === fileName) {
        return filePath;
      }
    }
    return null;
  }
  
  return searchRecursively('.');
}

async function getAIFix(fileContent, incident) {
  try {
    console.log('Sending to AI service for fix');
    const incidentData = {
      incidentId: incident.incidentId,
      errorLocation: incident.errorLocation,
      rootCauseHypothesis: incident.rootCauseHypothesis,
      solutions: incident.solutions
    };
    
    const response = await axios.post(
        'http://88.99.104.97:3002/api/fix-code',
        {
          file: fileContent,
          incident: incidentData
        }
      );
    
    if (response.data && response.data.fixedCode) {
      return response.data.fixedCode;
    } else {
      throw new Error('AI service did not return fixed code');
    }
  } catch (error) {
    throw new Error(`AI fix generation failed: ${error.message}`);
  }
}

function createPRDescription(incident) {
  return `## Auto-Fix for Incident #${incident.incidentId}

### Incident Details
- **Title:** ${incident.title}
- **Service:** ${incident.serviceName}
- **Error:** ${incident.errorLocation.exceptionType} in ${incident.errorLocation.className}.${incident.errorLocation.methodName}
- **Line:** ${incident.errorLocation.lineNumber}
- **Message:** ${incident.errorLocation.exceptionMessage}

### Root Cause
${incident.rootCauseHypothesis}

### Recommended Solution
${incident.solutions && incident.solutions.length > 0 
  ? incident.solutions[0].description 
  : 'No specific solution provided'}

---
🤖 This PR was automatically generated by the Observability Bot based on AI analysis.
👀 Please review carefully before merging.
`;
}

// Run the main function
main().catch(error => {
  console.error(error);
  process.exit(1);
});