import React, { useState } from 'react'
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import type { ReactNode } from 'react'

export interface DropdownItem {
  label: string
  icon?: ReactNode
  onClick?: () => void
}

interface IconDropdownProps {
  icon?: ReactNode
  items: DropdownItem[]
}

const IconDropdown: React.FC<IconDropdownProps> = ({ icon = <MoreVertIcon />, items }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleItemClick = (item: DropdownItem) => {
    handleClose()
    item.onClick?.()
  }

  return (
    <>
      <IconButton onClick={handleOpen}>
        {icon}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.map((item, index) => (
          <MenuItem key={index} onClick={() => handleItemClick(item)}>
            {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

export default IconDropdown