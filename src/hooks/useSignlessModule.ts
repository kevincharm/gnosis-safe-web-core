import { createMultiSendCallOnlyTx } from '@/services/tx/tx-sender'
import { useCallback, useMemo, useState } from 'react'
import { getSafeSDK } from './coreSDK/safeCoreSDK'
import useChainId from './useChainId'
import useSafeInfo from './useSafeInfo'

export function getSignlessModuleAddress(chainId: string) {
  if (chainId === '100') {
    return '0x9309bd93a8b662d315Ce0D43bb95984694F120Cb'
  }
}

export default function useSignlessModule() {
  const { safe } = useSafeInfo()
  const chainId = useChainId()
  const sdk = getSafeSDK()

  const isSignlessEnabled = useMemo(() => {
    const signlessModuleAddress = getSignlessModuleAddress(chainId)
    if (!signlessModuleAddress) {
      return false
    }

    const signlessModule = safe.modules?.find(
      (addr) => addr.value.toLowerCase() === signlessModuleAddress.toLowerCase(),
    )
    return Boolean(signlessModule)
  }, [safe, chainId])

  const enableSignlessModule = useCallback(async () => {
    const signlessModuleAddress = getSignlessModuleAddress(chainId)
    if (!sdk || !signlessModuleAddress) {
      return
    }

    const enableModuleTx = await sdk.createEnableModuleTx(signlessModuleAddress)
    const tx = {
      to: enableModuleTx.data.to,
      value: '0',
      data: enableModuleTx.data.data,
    }
    return createMultiSendCallOnlyTx([tx])
  }, [sdk, chainId])

  const disableSignlessModule = useCallback(async () => {
    const signlessModuleAddress = getSignlessModuleAddress(chainId)
    if (!sdk || !signlessModuleAddress || !isSignlessEnabled) {
      return
    }

    const disableModuleTx = await sdk.createDisableModuleTx(signlessModuleAddress)
    const tx = {
      to: disableModuleTx.data.to,
      value: '0',
      data: disableModuleTx.data.data,
    }
    return createMultiSendCallOnlyTx([tx])
  }, [sdk, chainId, isSignlessEnabled])

  const [openEnableSignless, setOpenEnableSignless] = useState<boolean>(false)
  const [openDisableSignless, setOpenDisableSignless] = useState<boolean>(false)

  return {
    isSignlessEnabled,
    enableSignlessModule,
    disableSignlessModule,
    openDisableSignless,
    setOpenDisableSignless,
    openEnableSignless,
    setOpenEnableSignless,
  }
}
