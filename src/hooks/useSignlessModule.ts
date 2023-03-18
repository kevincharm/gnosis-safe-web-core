import useLocalStorage from '@/services/local-storage/useLocalStorage'
import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { ethers } from 'ethers'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSafeSDK } from './coreSDK/safeCoreSDK'
import useChainId from './useChainId'
import useSafeInfo from './useSafeInfo'
import { useWeb3ReadOnly } from './wallets/web3'

export function getSignlessModuleAddress(chainId: string) {
  if (chainId === '100') {
    return '0x41e727A4c19EEA4B7D0A079688268F3E74D4F6F0'
  }
}

export async function createEncryptedKey(password: string) {
  const wallet = ethers.Wallet.createRandom()
  return wallet.encrypt(password)
}

export async function createEnableSignlessModule(chainId: string) {
  const sdk = getSafeSDK()
  const signlessModuleAddress = getSignlessModuleAddress(chainId)
  if (!sdk || !signlessModuleAddress) return

  const enableModuleTx = await sdk.createEnableModuleTx(signlessModuleAddress)
  const tx = {
    to: enableModuleTx.data.to,
    value: '0',
    data: enableModuleTx.data.data,
  }
  return createMultiSendCallOnlyTx([tx])
}

export async function createRegisterDelegateSignerTx(chainId: string, delegateAddress: string, expiry: number) {
  const signlessModuleAddress = getSignlessModuleAddress(chainId)
  if (!signlessModuleAddress) return

  const signless = new ethers.utils.Interface([
    'function registerDelegateSigner(address delegate, uint96 expiry) external',
  ])
  const data = signless.encodeFunctionData('registerDelegateSigner', [delegateAddress, expiry])
  const tx = {
    to: signlessModuleAddress,
    value: '0',
    data,
  }
  return createMultiSendCallOnlyTx([tx])
}

export default function useSignlessModule() {
  const { safe } = useSafeInfo()
  const chainId = useChainId()
  const sdk = getSafeSDK()

  const signlessModuleAddress = useMemo(() => getSignlessModuleAddress(chainId), [chainId])

  const isSignlessEnabled = useMemo(() => {
    if (!signlessModuleAddress) {
      return false
    }

    const signlessModule = safe.modules?.find(
      (addr) => addr.value.toLowerCase() === signlessModuleAddress.toLowerCase(),
    )
    return Boolean(signlessModule)
  }, [safe, signlessModuleAddress])

  const [delegatePrivateKeys, setPrivateKeys] = useLocalStorage<{ [safeAddress: string]: string }>(
    'signlessPrivateKeys',
  )
  const delegatePrivateKey = useMemo(() => {
    if (!delegatePrivateKeys || !safe) return
    return delegatePrivateKeys[safe.address.value]
  }, [delegatePrivateKeys, safe])
  const setPrivateKey = useCallback(
    (privateKey: string) => {
      if (!safe) return

      setPrivateKeys({
        ...delegatePrivateKeys,
        [safe.address.value]: privateKey,
      })
    },
    [safe, delegatePrivateKeys, setPrivateKeys],
  )

  const createLocalDelegate = useCallback(() => {
    if (delegatePrivateKey) throw new Error('A signless key already exists on this browser!')

    if (!sdk || !signlessModuleAddress) return

    const delegateWallet = ethers.Wallet.createRandom()
    setPrivateKey(delegateWallet.privateKey)
  }, [sdk, signlessModuleAddress, delegatePrivateKey, setPrivateKey])

  const readProvider = useWeb3ReadOnly()
  const signlessContract = useMemo(() => {
    if (!signlessModuleAddress || !readProvider) return

    return new ethers.Contract(
      signlessModuleAddress,
      [
        'function isValidDelegate(address safe, address delegate) external view returns (bool)',
        'function registerDelegateSigner(address delegate, uint96 expiry) external',
        'function getNonce(address user) external view returns (uint256)',
        'function exec(address delegate, address safe, address to, uint256 value, bytes calldata data, bytes calldata sig) public',
        'function execViaRelay(uint256 maxFee, address delegate, address safe, address to, uint256 value, bytes calldata data, bytes calldata sig) external',
      ],
      readProvider,
    )
  }, [signlessModuleAddress, readProvider])
  const [isValidDelegate, setIsValidDelegate] = useState<boolean>(false)
  useEffect(() => {
    if (!safe || !signlessContract || !delegatePrivateKey) return

    const delegate = new ethers.Wallet(delegatePrivateKey)
    signlessContract.isValidDelegate(safe.address.value, delegate.address).then((ret: boolean) => {
      setIsValidDelegate(ret)
    })
  }, [safe, signlessContract, delegatePrivateKey])

  const delegateAddress = useMemo(() => {
    if (!delegatePrivateKey) return
    return new ethers.Wallet(delegatePrivateKey).address
  }, [delegatePrivateKey])

  return {
    signlessModuleAddress,
    signlessContract,
    isSignlessEnabled,
    delegatePrivateKey,
    delegateAddress,
    isValidDelegate,
    createLocalDelegate,
  }
}
