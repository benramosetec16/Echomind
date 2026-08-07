'use client';

import React from 'react';
import { InstitutionalPDFReport } from '../components/PDFReport';

interface Props {
  data: any;
  institutionName: string;
}

export default function InstitutionalPDFReportWrapper({ data, institutionName }: Props) {
  return <InstitutionalPDFReport data={data} institutionName={institutionName} />;
}
