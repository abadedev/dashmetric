import { useQuery } from '@tanstack/react-query';

type DropdownOption = {
  id: number;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
};

export function useDropdownOptions(category: string) {
  return useQuery({
    queryKey: ['dropdown-options', category],
    queryFn: async () => {
      const res = await fetch(`/api/dropdown-options?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error('Falha ao carregar opções');
      const json = await res.json() as { data: DropdownOption[] };
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
