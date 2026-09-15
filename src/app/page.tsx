import { SinglePatientRegistration } from '@/components/SinglePatientRegistration';

export const metadata = {
  title: 'New Patient Registration | Apex Dental Hospital',
  description: 'Fast, secure contactless patient registration',
};

export default function HomePage() {
  return <SinglePatientRegistration />;
}
