import { DocumentType, DocumentStatus } from '../types';

export const calculateDocumentStatus = (expiryDate: Date | string): DocumentStatus => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  
  // Set to start of day for clean date comparisons
  now.setHours(0, 0, 0, 0);
  const expiryStart = new Date(expiry);
  expiryStart.setHours(0, 0, 0, 0);

  const diffTime = expiryStart.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return DocumentStatus.EXPIRED;
  }
  if (diffDays <= 30) {
    return DocumentStatus.EXPIRING_SOON;
  }
  return DocumentStatus.VALID;
};

export const getDaysRemaining = (expiryDate: Date | string): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiryStart = new Date(expiry);
  expiryStart.setHours(0, 0, 0, 0);

  const diffTime = expiryStart.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const MANDATORY_COMPLIANCE_DOCS = [
  DocumentType.INSURANCE,
  DocumentType.FITNESS,
  DocumentType.PUC,
];

export interface ComplianceEvaluation {
  isBlocked: boolean;
  reasons: string[];
  expiredDocs: string[];
  expiringSoonDocs: string[];
}

export const evaluateVehicleCompliance = (
  documents: Array<{ type: string; expiryDate: Date | string; status?: string }>
): ComplianceEvaluation => {
  const reasons: string[] = [];
  const expiredDocs: string[] = [];
  const expiringSoonDocs: string[] = [];

  for (const doc of documents) {
    const status = calculateDocumentStatus(doc.expiryDate);
    const days = getDaysRemaining(doc.expiryDate);

    if (status === DocumentStatus.EXPIRED) {
      expiredDocs.push(`${doc.type} (Expired ${Math.abs(days)} day(s) ago)`);
      if (MANDATORY_COMPLIANCE_DOCS.includes(doc.type as DocumentType)) {
        reasons.push(
          `Mandatory compliance document expired: ${doc.type} (Expired ${Math.abs(days)} days ago)`
        );
      }
    } else if (status === DocumentStatus.EXPIRING_SOON) {
      expiringSoonDocs.push(`${doc.type} (Expires in ${days} day(s))`);
    }
  }

  return {
    isBlocked: reasons.length > 0,
    reasons,
    expiredDocs,
    expiringSoonDocs,
  };
};
