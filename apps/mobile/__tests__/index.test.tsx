import { render, screen } from '@testing-library/react-native';
import Index from '../app/(tabs)/index';

describe('Index', () => {
  it('@eatme/core 파서로 해석한 재료 이름을 보여준다', async () => {
    await render(<Index />);
    expect(screen.getByText('감자')).toBeTruthy();
  });
});
