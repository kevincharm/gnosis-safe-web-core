import { useCallback, useState } from 'react'
import type { BaseTransaction, RequestId, SendTransactionRequestParams } from '@safe-global/safe-apps-sdk'

type TxModalState = {
  isOpen: boolean
  txs: BaseTransaction[]
  requestId: RequestId
  params?: SendTransactionRequestParams
}

const INITIAL_CONFIRM_TX_MODAL_STATE: TxModalState = {
  isOpen: false,
  txs: [],
  requestId: '',
  params: undefined,
}

type ReturnType = [
  TxModalState,
  (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => void,
  () => void,
]

const useTxModal = (): ReturnType => {
  const [txModalState, setTxModalState] = useState<TxModalState>(INITIAL_CONFIRM_TX_MODAL_STATE)

  const openTxModal = useCallback(
    (txs: BaseTransaction[], requestId: RequestId, params?: SendTransactionRequestParams) => {
      // TODO(kevincharm): Create a custom Safe App for enabling the Signless module. Once the
      // module is enabled, allow the safe owner to "login" and create a delegated private key
      // which will be saved on the user's browser (localStorage).
      // TODO(kevincharm): Show a modal the first time the user tries this action. The user
      // should be able to tick whether or not they want to be asked the next time they perform
      // transactions for this particular action.
      // In the case that the user approves, this app should fetch the locally-stored Signless
      // private key, automatically sign this transaction, then submit it via the Gelato relay.
      for (const tx of txs) {
        const selector = tx.data.slice(0, 10)
        // TODO(kevincharm): Remember choice for [to, selector]
      }
      return setTxModalState({
        isOpen: true,
        txs,
        requestId,
        params,
      })
    },
    [],
  )

  const closeTxModal = useCallback(() => setTxModalState(INITIAL_CONFIRM_TX_MODAL_STATE), [])

  return [txModalState, openTxModal, closeTxModal]
}

export default useTxModal
