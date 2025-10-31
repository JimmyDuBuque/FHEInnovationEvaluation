// Contract Configuration
const CONTRACT_ADDRESS = "0x5a9CC7eb07129Af3ED1dC5D4F3B061853AAf8566";
const CONTRACT_ABI = [
    // Write functions
    "function submitProject(string title, string description) external",
    "function submitEvaluation(uint32 projectId, uint8 innovationScore, uint8 feasibilityScore, uint8 impactScore, uint8 technicalScore) external",
    "function authorizeEvaluator(address evaluator) external",
    "function revokeEvaluator(address evaluator) external",
    "function startEvaluationPeriod(uint256 duration) external",
    "function endEvaluationPeriod() external",
    "function revealResults(uint32 projectId) external",

    // Read functions
    "function owner() external view returns (address)",
    "function nextProjectId() external view returns (uint32)",
    "function evaluationPeriod() external view returns (uint32)",
    "function authorizedEvaluators(address) external view returns (bool)",

    // Getters
    "function getProjectInfo(uint32 projectId) external view returns (string title, string description, address submitter, bool isActive, uint256 submissionTime, uint32 totalEvaluations, bool resultsRevealed, uint32 finalScore, uint32 ranking)",
    "function getEvaluationPeriodInfo(uint32 periodId) external view returns (uint256 startTime, uint256 endTime, bool isActive, uint32 totalProjects)",
    "function getCurrentEvaluationPeriod() external view returns (uint32)",
    "function hasEvaluated(uint32 projectId, address evaluator) external view returns (bool)",
    "function getProjectsByPeriod(uint32 periodId) external view returns (uint32[])",
    "function getRankedProject(uint32 periodId, uint32 rank) external view returns (uint32)",

    // Events
    "event ProjectSubmitted(uint32 indexed projectId, address indexed submitter, string title)",
    "event EvaluationSubmitted(uint32 indexed projectId, address indexed evaluator, uint32 evaluationPeriod)",
    "event EvaluationPeriodStarted(uint32 indexed periodId, uint256 startTime, uint256 endTime)",
    "event ResultsRevealed(uint32 indexed projectId, uint32 finalScore, uint32 ranking)",
    "event EvaluatorAuthorized(address indexed evaluator)",
    "event EvaluatorRevoked(address indexed evaluator)"
];

// Global Variables
let provider;
let signer;
let contract;
let userAddress;

// Initialize on page load
window.addEventListener('load', async () => {
    await initializeApp();
});

// Initialize application
async function initializeApp() {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined') {
            provider = new ethers.providers.Web3Provider(window.ethereum);

            // Check if already connected
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                await connectWallet();
            }
        } else {
            showStatus('error', '❌ Please install MetaMask wallet');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showStatus('error', 'Initialization failed: ' + error.message);
    }
}

// Connect wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask');
        }

        // Request account access permission
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Initialize contract
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        // Update UI
        document.getElementById('walletStatus').classList.add('hidden');
        document.getElementById('walletInfo').classList.remove('hidden');
        document.getElementById('walletAddress').textContent = userAddress;

        showStatus('success', '✅ Wallet connected successfully');

        // Load project selection list
        await loadProjectOptions();

    } catch (error) {
        console.error('Wallet connection error:', error);
        showStatus('error', 'Wallet connection failed: ' + error.message);
    }
}

// Show status information
function showStatus(type, message) {
    const statusDiv = document.getElementById('walletStatus');
    statusDiv.className = `status status-${type}`;
    statusDiv.innerHTML = message;
    statusDiv.classList.remove('hidden');

    // Hide success message after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

// Update score display
function updateScoreDisplay(type, value) {
    document.getElementById(type + 'Value').textContent = value;
}

// Submit project
async function submitProject() {
    try {
        if (!contract) {
            await connectWallet();
        }

        const title = document.getElementById('projectTitle').value.trim();
        const description = document.getElementById('projectDescription').value.trim();

        if (!title || !description) {
            showStatus('warning', '⚠️ Please fill in complete project information');
            return;
        }

        // Show loading state
        const submitButton = document.querySelector('#submitLoading').parentElement;
        const loadingSpan = document.getElementById('submitLoading');
        loadingSpan.classList.remove('hidden');
        submitButton.disabled = true;

        showStatus('info', '📤 Submitting project...');

        const tx = await contract.submitProject(title, description);
        showStatus('info', '⏳ Transaction submitted, waiting for confirmation...');

        const receipt = await tx.wait();

        // Clear form
        document.getElementById('projectTitle').value = '';
        document.getElementById('projectDescription').value = '';

        showStatus('success', '✅ Project submitted successfully!');

        // Reload project options
        await loadProjectOptions();

    } catch (error) {
        console.error('Project submission error:', error);
        showStatus('error', 'Submission failed: ' + error.message);
    } finally {
        // Restore button state
        const submitButton = document.querySelector('#submitLoading').parentElement;
        const loadingSpan = document.getElementById('submitLoading');
        loadingSpan.classList.add('hidden');
        submitButton.disabled = false;
    }
}

// Submit evaluation
async function submitEvaluation() {
    try {
        if (!contract) {
            await connectWallet();
        }

        const projectId = document.getElementById('evaluateProjectId').value;
        const innovation = document.getElementById('innovationScore').value;
        const feasibility = document.getElementById('feasibilityScore').value;
        const impact = document.getElementById('impactScore').value;
        const technical = document.getElementById('technicalScore').value;

        if (!projectId) {
            showStatus('warning', '⚠️ Please select a project to evaluate');
            return;
        }

        // Show loading state
        const evaluateButton = document.querySelector('#evaluateLoading').parentElement;
        const loadingSpan = document.getElementById('evaluateLoading');
        loadingSpan.classList.remove('hidden');
        evaluateButton.disabled = true;

        showStatus('info', '📊 Submitting evaluation...');

        const tx = await contract.submitEvaluation(
            parseInt(projectId),
            parseInt(innovation),
            parseInt(feasibility),
            parseInt(impact),
            parseInt(technical)
        );

        showStatus('info', '⏳ Transaction submitted, waiting for confirmation...');
        const receipt = await tx.wait();

        showStatus('success', '✅ Evaluation submitted successfully!');

        // Reset scores
        ['innovation', 'feasibility', 'impact', 'technical'].forEach(type => {
            document.getElementById(type + 'Score').value = 5;
            document.getElementById(type + 'Value').textContent = 5;
        });

    } catch (error) {
        console.error('Evaluation submission error:', error);
        showStatus('error', 'Evaluation submission failed: ' + error.message);
    } finally {
        // Restore button state
        const evaluateButton = document.querySelector('#evaluateLoading').parentElement;
        const loadingSpan = document.getElementById('evaluateLoading');
        loadingSpan.classList.add('hidden');
        evaluateButton.disabled = false;
    }
}

// Load project selection options
async function loadProjectOptions() {
    try {
        if (!contract) return;

        const nextId = await contract.nextProjectId();
        const select = document.getElementById('evaluateProjectId');

        // Clear existing options
        select.innerHTML = '<option value="">Choose project to evaluate</option>';

        for (let i = 1; i < nextId; i++) {
            try {
                const projectInfo = await contract.getProjectInfo(i);
                const [title, description, submitter, isActive] = projectInfo;

                if (isActive) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `${i}. ${title}`;
                    select.appendChild(option);
                }
            } catch (error) {
                console.log(`Project ${i} does not exist or cannot be accessed`);
            }
        }
    } catch (error) {
        console.error('Load project options error:', error);
    }
}

// Load project list
async function loadProjects() {
    try {
        if (!contract) {
            await connectWallet();
        }

        showStatus('info', '📋 Loading project list...');

        const nextId = await contract.nextProjectId();
        const projectsList = document.getElementById('projectsList');
        projectsList.innerHTML = '';

        if (nextId <= 1) {
            projectsList.innerHTML = '<div class="status status-info">No projects yet</div>';
            return;
        }

        for (let i = 1; i < nextId; i++) {
            try {
                const projectInfo = await contract.getProjectInfo(i);
                const [title, description, submitter, isActive, submissionTime, totalEvaluations, resultsRevealed, finalScore, ranking] = projectInfo;

                const projectDiv = document.createElement('div');
                projectDiv.className = 'project-item';

                const truncatedDescription = description.length > 200
                    ? description.substring(0, 200) + '...'
                    : description;

                const submissionDate = new Date(submissionTime * 1000).toLocaleString('en-US');

                projectDiv.innerHTML = `
                    <div class="project-title">Project #${i}: ${title}</div>
                    <p style="margin: 10px 0; color: #666;">${truncatedDescription}</p>
                    <div class="project-meta">
                        <div><strong>Submitter:</strong> ${submitter.substring(0, 10)}...${submitter.substring(submitter.length - 8)}</div>
                        <div><strong>Submission Time:</strong> ${submissionDate}</div>
                        <div><strong>Evaluations:</strong> ${totalEvaluations}</div>
                        <div><strong>Status:</strong> ${isActive ? 'Active' : 'Closed'}</div>
                        <div><strong>Results Revealed:</strong> ${resultsRevealed ? 'Yes' : 'No'}</div>
                        ${resultsRevealed ? `<div><strong>Final Score:</strong> ${finalScore}</div>` : ''}
                        ${resultsRevealed && ranking > 0 ? `<div><strong>Ranking:</strong> #${ranking}</div>` : ''}
                    </div>
                `;

                projectsList.appendChild(projectDiv);
            } catch (error) {
                console.log(`Failed to load project ${i}:`, error);
            }
        }

        showStatus('success', '✅ Project list loaded successfully');

    } catch (error) {
        console.error('Load project list error:', error);
        showStatus('error', 'Failed to load project list: ' + error.message);
    }
}

// Admin function: Start evaluation period
async function startEvaluationPeriod() {
    try {
        if (!contract) {
            await connectWallet();
        }

        const duration = prompt('Enter evaluation period duration (seconds):', '86400'); // Default 1 day
        if (!duration) return;

        showStatus('info', '⏳ Starting new evaluation period...');

        const tx = await contract.startEvaluationPeriod(parseInt(duration));
        await tx.wait();

        showStatus('success', '✅ Evaluation period started!');

    } catch (error) {
        console.error('Start evaluation period error:', error);
        showStatus('error', 'Failed to start evaluation period: ' + error.message);
    }
}

// Admin function: End evaluation period
async function endEvaluationPeriod() {
    try {
        if (!contract) {
            await connectWallet();
        }

        showStatus('info', '⏳ Ending current evaluation period...');

        const tx = await contract.endEvaluationPeriod();
        await tx.wait();

        showStatus('success', '✅ Evaluation period ended!');

    } catch (error) {
        console.error('End evaluation period error:', error);
        showStatus('error', 'Failed to end evaluation period: ' + error.message);
    }
}

// Admin function: Authorize evaluator
async function authorizeEvaluator() {
    try {
        if (!contract) {
            await connectWallet();
        }

        const evaluatorAddress = prompt('Enter evaluator address to authorize:');
        if (!evaluatorAddress) return;

        showStatus('info', '⏳ Authorizing evaluator...');

        const tx = await contract.authorizeEvaluator(evaluatorAddress);
        await tx.wait();

        showStatus('success', '✅ Evaluator authorized successfully!');

    } catch (error) {
        console.error('Authorize evaluator error:', error);
        showStatus('error', 'Failed to authorize evaluator: ' + error.message);
    }
}

// Admin function: Reveal results
async function revealResults() {
    try {
        if (!contract) {
            await connectWallet();
        }

        const projectId = prompt('Enter project ID to reveal results:');
        if (!projectId) return;

        showStatus('info', '⏳ Revealing results...');

        const tx = await contract.revealResults(parseInt(projectId));
        await tx.wait();

        showStatus('success', '✅ Results revealed successfully!');

        // Refresh project list to show updated results
        await loadProjects();

    } catch (error) {
        console.error('Reveal results error:', error);
        showStatus('error', 'Failed to reveal results: ' + error.message);
    }
}

// Disconnect wallet
function disconnectWallet() {
    // Reset global variables
    provider = null;
    signer = null;
    contract = null;
    userAddress = null;

    // Update UI
    document.getElementById('walletInfo').classList.add('hidden');
    document.getElementById('walletStatus').classList.remove('hidden');

    // Clear project options
    const select = document.getElementById('evaluateProjectId');
    select.innerHTML = '<option value="">Choose project to evaluate</option>';

    showStatus('info', '🔌 Wallet disconnected');
}

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
            // User disconnected
            document.getElementById('walletInfo').classList.add('hidden');
            document.getElementById('walletStatus').classList.remove('hidden');
            showStatus('warning', '⚠️ Wallet disconnected');
        } else {
            // Account changed
            await connectWallet();
        }
    });

    window.ethereum.on('chainChanged', (chainId) => {
        // Network changed, reload page
        window.location.reload();
    });
}