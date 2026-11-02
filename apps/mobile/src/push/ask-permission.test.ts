import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { render } from '@testing-library/react-native';
import { createElement } from 'react';
import { useAuth } from '../auth/auth-context';
import { maybeAskPushPermission, PushPromptHost, setPushPromptPresenter } from './ask-permission';
import { registerForPush } from './register';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('./register', () => ({ registerForPush: jest.fn() }));
jest.mock('../auth/auth-context', () => ({ useAuth: jest.fn() }));
jest.mock('../ui', () => ({ Button: () => null }));

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;
const getPermissions = Notifications.getPermissionsAsync as jest.Mock;
const register = registerForPush as jest.Mock;

describe('maybeAskPushPermission', () => {
  let presenter: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue(null);
    setItem.mockResolvedValue(undefined);
    getPermissions.mockResolvedValue({ status: 'undetermined' });
    register.mockResolvedValue('registered');
    presenter = jest.fn();
    setPushPromptPresenter(presenter);
  });

  afterEach(() => setPushPromptPresenter(null));

  it('이미 물어봤으면(플래그 있음) 시트를 띄우지 않는다', async () => {
    getItem.mockResolvedValue('1');
    await maybeAskPushPermission();
    expect(presenter).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('처음이면 플래그를 남기고 시트를 띄우며, 동의하면 권한 요청 후 등록한다', async () => {
    presenter.mockResolvedValue(true);
    await maybeAskPushPermission();
    expect(setItem).toHaveBeenCalledWith('eatme.pushAsked', '1');
    expect(presenter).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ requestPermission: true });
  });

  it('거절하면 등록하지 않는다(플래그는 남는다)', async () => {
    presenter.mockResolvedValue(false);
    await maybeAskPushPermission();
    expect(setItem).toHaveBeenCalledWith('eatme.pushAsked', '1');
    expect(register).not.toHaveBeenCalled();
  });

  it('OS 권한이 이미 허용돼 있으면 시트 없이 플래그만 남긴다', async () => {
    getPermissions.mockResolvedValue({ status: 'granted' });
    await maybeAskPushPermission();
    expect(presenter).not.toHaveBeenCalled();
    expect(setItem).toHaveBeenCalledWith('eatme.pushAsked', '1');
  });

  it('시트를 띄울 호스트가 없으면 플래그를 남기지 않는다', async () => {
    setPushPromptPresenter(null);
    await maybeAskPushPermission();
    expect(setItem).not.toHaveBeenCalled();
  });
});

// 첫 렌더는 react-native Modal 등을 처음 변환·로드해 느린 CI(콜드 캐시)에서 5초를 넘길 수 있다.
const RENDER_TIMEOUT_MS = 30_000;

describe('PushPromptHost 시작 시 토큰 재등록', () => {
  const mockedUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    register.mockResolvedValue('registered');
  });

  it.each([
    ['로그아웃', { status: 'signedOut', profile: null }],
    ['로그인했지만 프로필 미확인', { status: 'signedIn', profile: null }],
    ['로그인했지만 약관 미동의', { status: 'signedIn', profile: { termsAgreedAt: null } }],
  ])('%s 상태면 등록하지 않는다', async (_, auth) => {
    mockedUseAuth.mockReturnValue(auth);
    const screen = await render(createElement(PushPromptHost));
    expect(register).not.toHaveBeenCalled();
    await screen.unmount();
  }, RENDER_TIMEOUT_MS);

  it('로그인 + 약관 동의 상태면 권한 요청 없이 등록한다', async () => {
    mockedUseAuth.mockReturnValue({ status: 'signedIn', profile: { termsAgreedAt: '2026-11-03T00:00:00.000Z' } });
    const screen = await render(createElement(PushPromptHost));
    expect(register).toHaveBeenCalledWith({ requestPermission: false });
    await screen.unmount();
  }, RENDER_TIMEOUT_MS);
});
