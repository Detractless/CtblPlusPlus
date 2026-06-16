using System;
using System.Security.Cryptography;
using System.Text;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Interfaces.Security;
using CtblPlusPlus.Core.Models;

using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue;

public class QueueSecurityValidator
{
    private readonly IHmacProvider _hmacProvider;
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;

    public QueueSecurityValidator(IHmacProvider hmacProvider, IQueueRepository queueRepo, IAuditRepository auditRepo)
    {
        _hmacProvider = hmacProvider;
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
    }

    public bool VerifyHmac(DelayRequest req, QueueBatchContext context)
    {
        string payloadToSign = QueueSignaturePayload.BuildV2(req);
        string expectedSignature = _hmacProvider.ComputeHmac(payloadToSign);

        byte[] expectedBytes = Encoding.UTF8.GetBytes(expectedSignature);
        byte[] actualBytes   = Encoding.UTF8.GetBytes(req.Signature ?? string.Empty);

        if (CryptographicOperations.FixedTimeEquals(actualBytes, expectedBytes)) return true;

        context.Log($"[{DateTime.UtcNow:O}] [SECURITY WARNING] Queue Tampering Detected for Req '{req.Id}'\n");
        _queueRepo.UpdateRequestStatus(req.Id, QueueStatus.FailedSecurityViolation);
        _auditRepo.LogAction(req.BlockName, req.TargetUrl, "Rejected Tampered Request");
        return false;
    }
}



