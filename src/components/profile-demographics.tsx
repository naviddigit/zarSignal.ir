import { Select } from '@/components/ui/select';
import { activityAreas, ageGroups } from '@/lib/account-policy';

export function ProfileDemographics({ city, ageGroup, areaRequired = false, ageRequired = false }: {
  city?: string | null; ageGroup?: string | null; areaRequired?: boolean; ageRequired?: boolean;
}) {
  return <div className="profile-complete-grid">
    <Select name="city" label={`محدوده فعالیت ${areaRequired ? '*' : ''}`} defaultValue={activityAreas.some(value => value === city) ? city ?? '' : ''} required={areaRequired} options={activityAreas.map(value => ({ value, label: value }))} />
    <Select name="ageGroup" label={`سن ${ageRequired ? '*' : ''}`} defaultValue={ageGroups.some(value => value === ageGroup) ? ageGroup ?? '' : ''} required={ageRequired} options={ageGroups.map(value => ({ value, label: value }))} />
  </div>;
}
