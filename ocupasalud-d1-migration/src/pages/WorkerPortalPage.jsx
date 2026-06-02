import React from 'react';
import { useParams } from 'react-router-dom';
import { WorkerPortal } from '../modules/patients/components/WorkerPortal';

export default function WorkerPortalPage() {
  const { code } = useParams();
  return <WorkerPortal code={code} />;
}
