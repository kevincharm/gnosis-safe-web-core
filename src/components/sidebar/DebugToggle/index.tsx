import { type ChangeEvent, type ReactElement } from 'react'
import { Box, FormControlLabel, Switch } from '@mui/material'
import { localItem } from '@/services/local-storage/local'
import useLocalStorage from '@/services/local-storage/useLocalStorage'
import { setDarkMode } from '@/store/settingsSlice'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useAppDispatch } from '@/store'
import useSignlessModule from '@/hooks/useSignlessModule'

const LS_KEY = 'debugProdCgw'

export const cgwDebugStorage = localItem<boolean>(LS_KEY)

const DebugToggle = (): ReactElement => {
  const dispatch = useAppDispatch()
  const isDarkMode = useDarkMode()

  const [isProdGateway = false, setIsProdGateway] = useLocalStorage<boolean>(LS_KEY)

  const onToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setIsProdGateway(event.target.checked)

    setTimeout(() => {
      location.reload()
    }, 300)
  }

  const { isSignlessEnabled, setOpenDisableSignless, setOpenEnableSignless } = useSignlessModule()

  const onSignlessToggle = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setOpenEnableSignless(true)
      setOpenDisableSignless(false)
    } else {
      setOpenEnableSignless(false)
      setOpenDisableSignless(true)
    }
  }

  return (
    <Box py={2} ml={2}>
      <FormControlLabel
        control={<Switch checked={isDarkMode} onChange={(_, checked) => dispatch(setDarkMode(checked))} />}
        label="Dark mode"
      />
      <FormControlLabel control={<Switch checked={isProdGateway} onChange={onToggle} />} label="Use prod CGW" />
      <FormControlLabel
        control={<Switch checked={isSignlessEnabled} onChange={onSignlessToggle} />}
        label="Signless enabled"
      />
    </Box>
  )
}

export default DebugToggle
