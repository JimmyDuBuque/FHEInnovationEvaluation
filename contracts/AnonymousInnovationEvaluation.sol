// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint8, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AnonymousInnovationEvaluation is SepoliaConfig {

    address public owner;
    uint32 public nextProjectId;
    uint32 public evaluationPeriod;

    struct Project {
        string title;
        string description;
        address submitter;
        bool isActive;
        uint256 submissionTime;
        uint32 totalEvaluations;
        euint32 encryptedTotalScore;
        bool resultsRevealed;
        uint32 finalScore;
        uint32 ranking;
    }

    struct Evaluation {
        euint8 innovation;
        euint8 feasibility;
        euint8 impact;
        euint8 technical;
        euint32 totalScore;
        bool submitted;
        uint256 timestamp;
    }

    struct EvaluationPeriod {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint32[] projectIds;
        mapping(uint32 => bool) projectInPeriod;
        uint32 totalProjects;
    }

    mapping(uint32 => Project) public projects;
    mapping(uint32 => EvaluationPeriod) public evaluationPeriods;
    mapping(uint32 => mapping(address => Evaluation)) public evaluations;
    mapping(address => bool) public authorizedEvaluators;
    mapping(uint32 => mapping(uint32 => uint32)) public periodRankings;

    event ProjectSubmitted(uint32 indexed projectId, address indexed submitter, string title);
    event EvaluationSubmitted(uint32 indexed projectId, address indexed evaluator, uint32 evaluationPeriod);
    event EvaluationPeriodStarted(uint32 indexed periodId, uint256 startTime, uint256 endTime);
    event ResultsRevealed(uint32 indexed projectId, uint32 finalScore, uint32 ranking);
    event EvaluatorAuthorized(address indexed evaluator);
    event EvaluatorRevoked(address indexed evaluator);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextProjectId = 1;
        evaluationPeriod = 1;

        // Auto-start first evaluation period (30 days)
        evaluationPeriods[evaluationPeriod].startTime = block.timestamp;
        evaluationPeriods[evaluationPeriod].endTime = block.timestamp + 30 days;
        evaluationPeriods[evaluationPeriod].isActive = true;
        evaluationPeriods[evaluationPeriod].totalProjects = 0;
    }

    function authorizeEvaluator(address evaluator) external onlyOwner {
        authorizedEvaluators[evaluator] = true;
        emit EvaluatorAuthorized(evaluator);
    }

    function revokeEvaluator(address evaluator) external onlyOwner {
        authorizedEvaluators[evaluator] = false;
        emit EvaluatorRevoked(evaluator);
    }

    function submitProject(string memory title, string memory description) external {
        uint32 projectId = nextProjectId++;

        projects[projectId] = Project({
            title: title,
            description: description,
            submitter: msg.sender,
            isActive: true,
            submissionTime: block.timestamp,
            totalEvaluations: 0,
            encryptedTotalScore: FHE.asEuint32(0),
            resultsRevealed: false,
            finalScore: 0,
            ranking: 0
        });

        if (evaluationPeriods[evaluationPeriod].isActive) {
            evaluationPeriods[evaluationPeriod].projectIds.push(projectId);
            evaluationPeriods[evaluationPeriod].projectInPeriod[projectId] = true;
            evaluationPeriods[evaluationPeriod].totalProjects++;
        }

        FHE.allowThis(projects[projectId].encryptedTotalScore);

        emit ProjectSubmitted(projectId, msg.sender, title);
    }

    function startEvaluationPeriod(uint256 duration) external onlyOwner {
        require(!evaluationPeriods[evaluationPeriod].isActive, "Period already active");

        evaluationPeriods[evaluationPeriod].startTime = block.timestamp;
        evaluationPeriods[evaluationPeriod].endTime = block.timestamp + duration;
        evaluationPeriods[evaluationPeriod].isActive = true;
        evaluationPeriods[evaluationPeriod].totalProjects = 0;

        emit EvaluationPeriodStarted(evaluationPeriod, block.timestamp, block.timestamp + duration);
    }

    function submitEvaluation(
        uint32 projectId,
        uint8 innovationScore,
        uint8 feasibilityScore,
        uint8 impactScore,
        uint8 technicalScore
    ) external {
        require(projects[projectId].isActive, "Project not active");
        require(!evaluations[projectId][msg.sender].submitted, "Already evaluated");
        require(innovationScore <= 10 && feasibilityScore <= 10 && impactScore <= 10 && technicalScore <= 10, "Scores must be 0-10");

        euint8 encInnovation = FHE.asEuint8(innovationScore);
        euint8 encFeasibility = FHE.asEuint8(feasibilityScore);
        euint8 encImpact = FHE.asEuint8(impactScore);
        euint8 encTechnical = FHE.asEuint8(technicalScore);

        euint32 totalScore = FHE.add(
            FHE.add(FHE.asEuint32(encInnovation), FHE.asEuint32(encFeasibility)),
            FHE.add(FHE.asEuint32(encImpact), FHE.asEuint32(encTechnical))
        );

        evaluations[projectId][msg.sender] = Evaluation({
            innovation: encInnovation,
            feasibility: encFeasibility,
            impact: encImpact,
            technical: encTechnical,
            totalScore: totalScore,
            submitted: true,
            timestamp: block.timestamp
        });

        projects[projectId].encryptedTotalScore = FHE.add(
            projects[projectId].encryptedTotalScore,
            totalScore
        );
        projects[projectId].totalEvaluations++;

        FHE.allowThis(encInnovation);
        FHE.allowThis(encFeasibility);
        FHE.allowThis(encImpact);
        FHE.allowThis(encTechnical);
        FHE.allowThis(totalScore);
        FHE.allowThis(projects[projectId].encryptedTotalScore);
        FHE.allow(totalScore, msg.sender);

        emit EvaluationSubmitted(projectId, msg.sender, evaluationPeriod);
    }

    function endEvaluationPeriod() external onlyOwner {
        require(evaluationPeriods[evaluationPeriod].isActive, "No active period");
        require(block.timestamp > evaluationPeriods[evaluationPeriod].endTime, "Period not ended");

        evaluationPeriods[evaluationPeriod].isActive = false;
        evaluationPeriod++;
    }

    function revealResults(uint32 projectId) external onlyOwner {
        require(projects[projectId].isActive, "Project not active");
        require(!projects[projectId].resultsRevealed, "Results already revealed");
        require(projects[projectId].totalEvaluations > 0, "No evaluations");

        // Request async decryption
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(projects[projectId].encryptedTotalScore);
        FHE.requestDecryption(cts, this.processRevealResults.selector);
    }

    function processRevealResults(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify signatures
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // Decode the decrypted totalScore from cleartexts
        uint32 totalScore = abi.decode(cleartexts, (uint32));

        // Find the project to reveal (simple approach - store projectId in mapping for production)
        // For now, we'll use a simplified approach
        for (uint32 i = 1; i < nextProjectId; i++) {
            if (!projects[i].resultsRevealed && projects[i].totalEvaluations > 0) {
                uint32 averageScore = projects[i].totalEvaluations > 0
                    ? totalScore / projects[i].totalEvaluations
                    : 0;

                projects[i].finalScore = averageScore;
                projects[i].resultsRevealed = true;

                uint32 ranking = _calculateRanking(i, averageScore);
                projects[i].ranking = ranking;
                periodRankings[evaluationPeriod - 1][ranking] = i;

                emit ResultsRevealed(i, averageScore, ranking);
                break;
            }
        }
    }

    function _calculateRanking(uint32 projectId, uint32 score) private view returns (uint32) {
        uint32 rank = 1;
        uint32 currentPeriod = evaluationPeriod > 0 ? evaluationPeriod - 1 : evaluationPeriod;

        for (uint32 i = 0; i < evaluationPeriods[currentPeriod].projectIds.length; i++) {
            uint32 otherId = evaluationPeriods[currentPeriod].projectIds[i];
            if (otherId != projectId && projects[otherId].resultsRevealed && projects[otherId].finalScore > score) {
                rank++;
            }
        }
        return rank;
    }

    function getProjectInfo(uint32 projectId) external view returns (
        string memory title,
        string memory description,
        address submitter,
        bool isActive,
        uint256 submissionTime,
        uint32 totalEvaluations,
        bool resultsRevealed,
        uint32 finalScore,
        uint32 ranking
    ) {
        Project storage project = projects[projectId];
        return (
            project.title,
            project.description,
            project.submitter,
            project.isActive,
            project.submissionTime,
            project.totalEvaluations,
            project.resultsRevealed,
            project.finalScore,
            project.ranking
        );
    }

    function getEvaluationPeriodInfo(uint32 periodId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint32 totalProjects
    ) {
        EvaluationPeriod storage period = evaluationPeriods[periodId];
        return (
            period.startTime,
            period.endTime,
            period.isActive,
            period.totalProjects
        );
    }

    function getCurrentEvaluationPeriod() external view returns (uint32) {
        return evaluationPeriod;
    }

    function hasEvaluated(uint32 projectId, address evaluator) external view returns (bool) {
        return evaluations[projectId][evaluator].submitted;
    }

    function getProjectsByPeriod(uint32 periodId) external view returns (uint32[] memory) {
        return evaluationPeriods[periodId].projectIds;
    }

    function getRankedProject(uint32 periodId, uint32 rank) external view returns (uint32) {
        return periodRankings[periodId][rank];
    }
}
