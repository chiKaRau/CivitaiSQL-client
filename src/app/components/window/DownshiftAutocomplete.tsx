// DownshiftAutocomplete.tsx
import React, { useRef } from 'react';
import Downshift from 'downshift';
import {
    TextField,
    Paper,
    MenuItem,
    ListItemText,
    FormHelperText,
} from '@mui/material';
import { styled } from '@mui/system';

interface DownshiftAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    options: string[];
    label?: string;
    helperText?: string;
    width?: number | string;
    inputRefProp?: React.Ref<HTMLInputElement>;
}

// Styled component for the dropdown menu
const Dropdown = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    zIndex: 1,
    marginTop: theme.spacing(1),
    left: 0,
    right: 0,
    maxHeight: 200,
    overflowY: 'auto',
}));

const DownshiftAutocomplete: React.FC<DownshiftAutocompleteProps> = ({
    value,
    onChange,
    onBlur,
    options,
    label = 'Autocomplete',
    helperText = '',
    width = 350,
    inputRefProp,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <Downshift
            selectedItem={value}
            inputValue={value}
            onChange={(selection) => {
                onChange(selection || '');
            }}
            onInputValueChange={(inputValue) => {
                onChange(inputValue);
            }}
            itemToString={(item) => (item ? item : '')}
        >
            {({
                getInputProps,
                getItemProps,
                getMenuProps,
                isOpen,
                highlightedIndex,
                openMenu,
            }) => (
                <div style={{ position: 'relative', width: width }}>
                    <TextField
                        {...getInputProps({
                            onBlur: onBlur,
                            onFocus: () => {
                                if (inputRef.current) {
                                    inputRef.current.scrollLeft =
                                        inputRef.current.scrollWidth -
                                        inputRef.current.offsetWidth +
                                        100;
                                }
                                openMenu();
                            },
                            onClick: () => {
                                openMenu();
                            },
                            inputRef: inputRefProp || inputRef,
                            label: label,
                            helperText: helperText,
                        })}
                        fullWidth
                        variant="outlined"
                    />
                    {helperText && (
                        <FormHelperText error>{helperText}</FormHelperText>
                    )}
                    {isOpen && options.length > 0 && (
                        <Dropdown {...getMenuProps()}>
                            {options.map((item, index) => (
                                <MenuItem
                                    {...getItemProps({ key: item, index, item })}
                                    selected={highlightedIndex === index}
                                    component="div"
                                    style={{
                                        fontWeight: highlightedIndex === index ? 700 : 400,
                                    }}
                                >
                                    <ListItemText primary={item} />
                                </MenuItem>
                            ))}
                        </Dropdown>
                    )}
                </div>
            )}
        </Downshift>
    );
};

export default DownshiftAutocomplete;
