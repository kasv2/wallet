import { useCallback } from 'react';

import { Account, AddressType } from '@/shared/types';
import { useWallet } from '@/ui/utils';

import { AppState } from '..';
import { useAppDispatch, useAppSelector } from '../hooks';
import { useCurrentKeyring } from '../keyrings/hooks';
import { keyringsActions } from '../keyrings/reducer';
import { settingsActions } from '../settings/reducer';
import { accountActions } from './reducer';

export function useAccountsState(): AppState['accounts'] {
  return useAppSelector((state) => state.accounts);
}

export function useCurrentAccount() {
  const accountsState = useAccountsState();
  return accountsState.current;
}

export function useAccounts() {
  const accountsState = useAccountsState();
  return accountsState.accounts;
}

export function useAccountBalance(address?: string) {
  const accountsState = useAccountsState();
  const currentAccount = useCurrentAccount();
  if (address) {
    return (
      accountsState.balanceMap[address] || {
        amount: '0',
        expired: false,
        confirm_kas_amount: '0',
        pending_kas_amount: '0',
      }
    );
  }
  return (
    accountsState.balanceMap[currentAccount.address] || {
      amount: '0',
      expired: true,
      confirm_kas_amount: '0',
      pending_kas_amount: '0',
    }
  );
}

export function useAddressSummary() {
  const accountsState = useAccountsState();
  return accountsState.addressSummary;
}

export function useAppSummary() {
  const accountsState = useAccountsState();
  return accountsState.appSummary;
}

export function useUnreadAppSummary() {
  const accountsState = useAccountsState();
  const summary = accountsState.appSummary;
  return summary.apps.find((w) => w.time && summary.readTabTime && w.time > summary.readTabTime);
}

export function useReadTab() {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const appSummary = useAppSummary();
  return useCallback(
    async (name: 'app' | 'home' | 'settings') => {
      await wallet.readTab(name);
      if (name == 'app') {
        const appSummary = await wallet.getAppSummary();
        dispatch(accountActions.setAppSummary(appSummary));
      }
    },
    [dispatch, wallet, appSummary]
  );
}

export function useReadApp() {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const appSummary = useAppSummary();
  return useCallback(
    async (id: number) => {
      await wallet.readApp(id);
      const appSummary = await wallet.getAppSummary();
      dispatch(accountActions.setAppSummary(appSummary));
    },
    [dispatch, wallet, appSummary]
  );
}

export function useHistory() {
  const accountsState = useAccountsState();
  const address = useAccountAddress();
  return accountsState.historyMap[address] || { list: [], expired: true };
}

export function useAccountAddress() {
  const currentAccount = useCurrentAccount();
  return currentAccount.address;
}

export function useSetCurrentAccountCallback() {
  const dispatch = useAppDispatch();
  return useCallback(
    (account: Account) => {
      dispatch(accountActions.setCurrent(account));
    },
    [dispatch]
  );
}

export function useImportAccountCallback() {
  const wallet = useWallet();
  const dispatch = useAppDispatch();
  const currentKeyring = useCurrentKeyring();
  return useCallback(
    async (privateKey: string, addressType: AddressType) => {
      let success = false;
      let error;
      try {
        const alianName = await wallet.getNextAlianName(currentKeyring);
        await wallet.createKeyringWithPrivateKey(privateKey, addressType, alianName);
        const currentAccount = await wallet.getCurrentAccount();
        dispatch(accountActions.setCurrent(currentAccount));

        success = true;
      } catch (e) {
        console.log(e);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        error = (e as any).message;
      }
      return { success, error };
    },
    [dispatch, wallet, currentKeyring]
  );
}

export function useChangeAccountNameCallback() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  return useCallback(
    async (name: string) => {
      await wallet.updateAlianName(currentAccount.pubkey, name);
      dispatch(accountActions.setCurrentAccountName(name));
    },
    [dispatch, wallet, currentAccount]
  );
}

export function useChangeAddressFlagCallback() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  return useCallback(
    async (isAdd: boolean, flag: number) => {
      const account = isAdd
        ? await wallet.addAddressFlag(currentAccount, flag)
        : await wallet.removeAddressFlag(currentAccount, flag);
      dispatch(accountActions.setCurrentAddressFlag(account.flag));
    },
    [dispatch, wallet, currentAccount]
  );
}

export function useFetchHistoryCallback() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  const address = useAccountAddress();
  return useCallback(async () => {
    const _accountHistory = await wallet.getAddressHistory(address);
    dispatch(
      accountActions.setHistory({
        address: address,
        list: _accountHistory
      })
    );
  }, [dispatch, wallet, address]);
}

export function useFetchBalanceCallback() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const balance = useAccountBalance();
  return useCallback(async () => {
    if (!currentAccount.address) return;
    const cachedBalance = await wallet.getAddressCacheBalance(currentAccount.address);
    const _accountBalance = await wallet.getAddressBalance(currentAccount.address);
    dispatch(
      accountActions.setBalance({
        address: currentAccount.address,
        amount: _accountBalance.amount,
        kas_amount: _accountBalance.kas_amount,
        confirm_kas_amount: _accountBalance.confirm_kas_amount,
        pending_kas_amount: _accountBalance.pending_kas_amount
      })
    );
    if (cachedBalance.amount !== _accountBalance.amount) {
      dispatch(accountActions.expireHistory());
    }

    const summary = await wallet.getAddressSummary(currentAccount.address);
    dispatch(accountActions.setAddressSummary(summary));
  }, [dispatch, wallet, currentAccount, balance]);
}

export function useFetchBalancesCallback() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  const accounts = useAccounts();
  return useCallback(async () => {
    const addresses: string[] = accounts.map((item) => item.address);
    if (!addresses || addresses.length == 0) return;
    const _accountsBalanceArray = await wallet.getAddressesBalance(addresses);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balanceArray: any[] = [];
    for (let i = 0; i < _accountsBalanceArray.length; i++) {
      balanceArray.push({
        address: addresses[i],
        amount: _accountsBalanceArray[i].amount,
        kas_amount: _accountsBalanceArray[i].kas_amount,
        confirm_kas_amount: _accountsBalanceArray[i].confirm_kas_amount,
        pending_kas_amount: _accountsBalanceArray[i].pending_kas_amount
      });
    }
    dispatch(accountActions.setBalances(balanceArray));
  }, [dispatch, wallet, accounts]);
}

export function useReloadAccounts() {
  const dispatch = useAppDispatch();
  const wallet = useWallet();
  return useCallback(async () => {
    const keyrings = await wallet.getKeyrings();
    dispatch(keyringsActions.setKeyrings(keyrings));

    const currentKeyring = await wallet.getCurrentKeyring();
    dispatch(keyringsActions.setCurrent(currentKeyring));

    const _accounts = await wallet.getAccounts();
    dispatch(accountActions.setAccounts(_accounts));

    const account = await wallet.getCurrentAccount();
    dispatch(accountActions.setCurrent(account));

    dispatch(accountActions.expireBalance());

    wallet.getWalletConfig().then((data) => {
      dispatch(settingsActions.updateSettings({ walletConfig: data }));
    });
  }, [dispatch, wallet]);
}
