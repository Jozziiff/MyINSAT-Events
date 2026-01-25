import { IsString, IsOptional } from 'class-validator';

export class UpdateClubDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    paymentInfo?: string;
}
