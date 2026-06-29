import { Button } from '@/components/ui/Button';

const SocialSignupButtons = () => {
  return (
    <div className="mt-8 space-y-3 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-slate-200" />
        <span>또는</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline">
          카카오로 시작하기
        </Button>
        <Button type="button" variant="outline">
          Apple로 시작하기
        </Button>
      </div>
    </div>
  );
};

export default SocialSignupButtons;
