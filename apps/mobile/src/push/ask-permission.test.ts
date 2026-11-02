import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { maybeAskPushPermission, setPushPromptPresenter } from './ask-permission';
import { registerForPush } from './register';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('./register', () => ({ registerForPush: jest.fn() }));
jest.mock('../auth/auth-context', () => ({ useAuth: jest.fn() }));

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
